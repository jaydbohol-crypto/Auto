const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "katorsex",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Get random video from Katorsex",
  commandCategory: "video",
  usages: "/katorsex",
  cooldowns: 5
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  try {
    // Get user name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Initialize memory
    if (!memory[threadID]) {
      memory[threadID] = {
        history: []
      };
    }

    // Send initial message
    const waiting = await api.sendMessage("⏳ Fetching random video...", threadID, messageID);

    // Fetch videos from API
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/katorsex?page=1`;
    
    const response = await axios.get(apiUrl);
    
    if (!response.data || !response.data.results || response.data.results.length === 0) {
      return api.editMessage("❌ No videos found.", waiting.messageID);
    }

    // Get the first video
    const firstVideo = response.data.results[0];
    
    // Find the video URL (try different possible fields)
    let videoUrl = null;
    if (firstVideo.videoUrl) videoUrl = firstVideo.videoUrl;
    else if (firstVideo.downloadUrl) videoUrl = firstVideo.downloadUrl;
    else if (firstVideo.url) videoUrl = firstVideo.url;
    else if (firstVideo.link) videoUrl = firstVideo.link;
    else if (firstVideo.video) videoUrl = firstVideo.video;

    if (!videoUrl) {
      console.log("First video data:", firstVideo);
      return api.editMessage("❌ Could not find video URL.", waiting.messageID);
    }

    // Update waiting message
    api.editMessage(`📥 Downloading: ${firstVideo.title || 'Video'}...`, waiting.messageID);

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache", "katorsex");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download the video
    const videoPath = path.join(cacheDir, `katorsex_${Date.now()}.mp4`);
    
    try {
      const videoResponse = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
        }
      });

      fs.writeFileSync(videoPath, videoResponse.data);
      
      // Get file size
      const stats = fs.statSync(videoPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Delete waiting message
      api.unsendMessage(waiting.messageID);

      // Send the video
      api.sendMessage(
        {
          body: `🎬 **KATORSEX VIDEO**\n━━━━━━━━━━━━━━━━\n` +
                `**Title:** ${firstVideo.title || 'Untitled'}\n` +
                `**Size:** ${fileSizeMB} MB\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `💬 Requested by: ${senderName}`,
          attachment: fs.createReadStream(videoPath)
        },
        threadID,
        (err) => {
          if (err) console.error("Error sending video:", err);
          // Clean up file after sending
          setTimeout(() => {
            try {
              if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
              }
            } catch (e) {}
          }, 5000);
        },
        messageID
      );

      // Store in history
      memory[threadID].history.push({
        user: senderName,
        title: firstVideo.title,
        time: Date.now()
      });

    } catch (downloadErr) {
      console.error("Download error:", downloadErr);
      api.editMessage(`❌ Download failed: ${downloadErr.message}`, waiting.messageID);
    }

  } catch (err) {
    console.error("Katorsex Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
