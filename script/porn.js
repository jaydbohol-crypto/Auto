const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "porn",
  version: "3.1.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Get random video",
  commandCategory: "video",
  usages: "/porn",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  try {
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    const waiting = await api.sendMessage("⏳ Fetching video...", threadID, messageID);

    // Try multiple pages if first fails
    let videoData = null;
    let videoUrl = null;
    
    for (let page = 1; page <= 3; page++) {
      try {
        const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/katorsex?page=${page}`;
        const response = await axios.get(apiUrl);
        
        if (response.data && response.data.results && response.data.results.length > 0) {
          // Try each video on the page
          for (const video of response.data.results) {
            // Check different URL fields
            const possibleUrl = video.videoUrl || video.downloadUrl || video.url || video.link || video.video;
            if (possibleUrl) {
              videoData = video;
              videoUrl = possibleUrl;
              break;
            }
          }
          if (videoUrl) break;
        }
      } catch (e) {
        console.log(`Page ${page} failed:`, e.message);
      }
    }

    if (!videoUrl || !videoData) {
      return api.editMessage("❌ No videos available.", waiting.messageID);
    }

    api.editMessage(`📥 Downloading: ${videoData.title || 'Video'}...`, waiting.messageID);

    const cacheDir = path.join(__dirname, "cache", "katorsex");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const videoPath = path.join(cacheDir, `katorsex_${Date.now()}.mp4`);
    
    const videoResponse = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://betadash-api-swordslush-production.up.railway.app/'
      }
    });

    fs.writeFileSync(videoPath, videoResponse.data);
    
    const stats = fs.statSync(videoPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    api.unsendMessage(waiting.messageID);

    api.sendMessage(
      {
        body: `🎬 **VIDEO**\n━━━━━━━━━━━━━━━━\n` +
              `📹 ${videoData.title || 'Untitled'}\n` +
              `📦 ${fileSizeMB} MB\n` +
              `━━━━━━━━━━━━━━━━\n` +
              `👤 ${senderName}`,
        attachment: fs.createReadStream(videoPath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error:", err);
        setTimeout(() => {
          try { fs.unlinkSync(videoPath); } catch (e) {}
        }, 5000);
      },
      messageID
    );

  } catch (err) {
    console.error("Error:", err);
    api.sendMessage(`❌ ${err.message}`, threadID, messageID);
  }
};
