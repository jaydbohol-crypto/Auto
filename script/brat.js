const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "brat",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Generate brat style image from text",
  commandCategory: "ai",
  usages: "brat <text>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const text = args.join(" ");

  if (!text) {
    return api.sendMessage(
      "🖼 Please provide text to generate an image.\n\nExample:\n brat hello world",
      threadID,
      messageID
    );
  }

  try {
    const waiting = await api.sendMessage("🎨 Generating brat image... please wait.", threadID, messageID);

    // Array of working Brat APIs (tries each one until success)
    const apis = [
      {
        url: `https://api.popcat.xyz/brat?text=${encodeURIComponent(text)}`,
        type: 'image'
      },
      {
        url: `https://brat-generator.com/api/generate?text=${encodeURIComponent(text)}`,
        type: 'image'
      },
      {
        url: `https://api.hamsterx.repl.co/brat?text=${encodeURIComponent(text)}`,
        type: 'image'
      },
      {
        url: `https://api.nexoracle.com/brat?text=${encodeURIComponent(text)}&apikey=free`,
        type: 'image'
      },
      {
        url: `https://api.ryzendesu.vip/api/brat?text=${encodeURIComponent(text)}`,
        type: 'json',
        path: 'url'
      }
    ];

    let imageData = null;
    let usedApi = null;

    // Try each API until one works
    for (const api of apis) {
      try {
        console.log("Trying API:", api.url);
        
        if (api.type === 'json') {
          const response = await axios.get(api.url, { 
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          
          if (response.data && response.data[api.path]) {
            // If API returns JSON with image URL
            const imgResponse = await axios.get(response.data[api.path], { 
              responseType: "arraybuffer",
              timeout: 10000
            });
            imageData = imgResponse.data;
            usedApi = api.url;
            break;
          }
        } else {
          // API returns image directly
          const response = await axios.get(api.url, { 
            responseType: "arraybuffer",
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          
          if (response.data && response.data.length > 1000) { // Basic check if it's an image
            imageData = response.data;
            usedApi = api.url;
            break;
          }
        }
      } catch (e) {
        console.log(`API ${api.url} failed:`, e.message);
        continue; // Try next API
      }
    }

    if (!imageData) {
      // If all APIs fail, use fallback canvas generation
      return await generateFallbackImage(api, event, text, waiting);
    }

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Save image
    const imagePath = path.join(cacheDir, `brat_${Date.now()}.png`);
    fs.writeFileSync(imagePath, imageData);

    // Get file size
    const stats = fs.statSync(imagePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    // Delete waiting message
    api.unsendMessage(waiting.messageID);

    // Send the image
    api.sendMessage(
      {
        body: `🖼 BRAT GENERATOR\n━━━━━━━━━━━━━━━━\nText: ${text}\n📦 Size: ${fileSizeKB} KB\n━━━━━━━━━━━━━━━━`,
        attachment: fs.createReadStream(imagePath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending image:", err);
        // Clean up file
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (e) {
          console.error("Error deleting file:", e);
        }
      },
      messageID
    );

  } catch (err) {
    console.error("Brat Command Error:", err);
    
    api.sendMessage(`❌ Error generating image: ${err.message}`, threadID, messageID);
  }
};

// Fallback function to generate image locally if all APIs fail
async function generateFallbackImage(api, event, text, waiting) {
  const { threadID, messageID } = event;
  
  try {
    // Simple fallback using a different service
    const fallbackUrl = `https://api.popcat.xyz/brat?text=${encodeURIComponent(text)}`;
    
    const response = await axios.get(fallbackUrl, { 
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const imagePath = path.join(cacheDir, `brat_${Date.now()}.png`);
    fs.writeFileSync(imagePath, response.data);

    api.unsendMessage(waiting.messageID);

    api.sendMessage(
      {
        body: `🖼 BRAT GENERATOR (Fallback)\n━━━━━━━━━━━━━━━━\nText: ${text}`,
        attachment: fs.createReadStream(imagePath)
      },
      threadID,
      () => {
        try { fs.unlinkSync(imagePath); } catch (e) {}
      },
      messageID
    );
  } catch (err) {
    api.sendMessage("❌ All Brat APIs are currently down. Please try again later.", threadID, messageID);
  }
}
