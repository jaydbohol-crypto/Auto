module.exports.config = {
  name: "porn",
  version: "1.0", 
  role: 0,
  credits: "syntaxt0x1c",
  description: "Get a random PornHub video.",
};

module.exports.run = async ({ api, event }) => {
  const axios = require('axios');
  
  try {
    // Construct API request URL
    const url = 'https://betadash-api-swordslush-production.up.railway.app/pornhub/random';

    // Send request to PornHub random endpoint
    const response = await axios.get(url);
    
    if (!response.data || !response.data.videos) {
      return api.sendMessage("Failed to fetch video.", event.threadID);
    }

    let videoUrl;
    for (const video of response.data.videos) {
      if (!video.link) continue;

      try {
        // Test if the link is valid with timeout
        await axios.head(video.link, { timeout: 5000 });
        
        videoUrl = video.link;
        break;
      } catch (e) {}
    }

    if (!videoUrl) return api.sendMessage("No playable videos available.", event.threadID);

    // Download the video to cache
    const cacheDir = path.join(__dirname, "cache");
    fs.existsSync(cacheDir) || fs.mkdirSync(cacheDir, { recursive: true });
    
    const tempPath = path.join(cacheDir, `porn_${Date.now()}.mp4`);
    await axios.get(videoUrl, {
      responseType: 'stream',
      timeout: 15000
    }).then(response => response.data.pipe(fs.createWriteStream(tempPath)));

    // Send the video to chat and cleanup when done
    api.sendMessage({ attachment: fs.createReadStream(tempPath) }, event.threadID);
    
    setTimeout(() => {
      try { 
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); 
      } catch(e) {}
    }, 3000);

  } catch (error) {
    console.error("Porn download error:", error.message);
    return api.sendMessage(`Download failed: ${error.message}`, event.threadID);
  }
};
