const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "katorsex",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Get videos from Katorsex API",
  commandCategory: "video",
  usages: "/katorsex [page number] or /katorsex [search]",
  cooldowns: 3
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  let page = 1;
  let searchQuery = "";

  // Check if first argument is a number (page)
  if (args.length > 0 && !isNaN(args[0])) {
    page = parseInt(args[0]);
    searchQuery = args.slice(1).join(" ");
  } else {
    searchQuery = args.join(" ");
  }

  try {
    // Get user name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Initialize memory
    if (!memory[threadID]) {
      memory[threadID] = {
        history: [],
        videoLists: {}
      };
    }
    memory[threadID].history.push(`${senderName} requested katorsex videos (page ${page})`);

    // Fetch videos from API
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/katorsex?page=${page}`;
    
    const waiting = await api.sendMessage(`📹 Fetching videos from page ${page}...`, threadID, messageID);
    
    const response = await axios.get(apiUrl);
    
    if (!response.data || !response.data.results || response.data.results.length === 0) {
      return api.editMessage("❌ No videos found on this page.", waiting.messageID);
    }

    let videos = response.data.results;
    
    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      videos = videos.filter(video => 
        video.title.toLowerCase().includes(query)
      );
      
      if (videos.length === 0) {
        return api.editMessage(`❌ No videos found matching "${searchQuery}".`, waiting.messageID);
      }
    }

    // Limit to first 10 videos for display
    const displayVideos = videos.slice(0, 10);

    // Create a numbered list of videos
    let listMessage = `📋 **KATORSEX VIDEOS** (Page ${page})\n`;
    listMessage += `━━━━━━━━━━━━━━━━\n`;
    listMessage += `Found: ${videos.length} videos\n`;
    listMessage += `Showing: ${displayVideos.length} videos\n\n`;
    
    displayVideos.forEach((video, index) => {
      listMessage += `${index + 1}. **${video.title}**\n`;
      if (video.duration) listMessage += `   ⏱️ Duration: ${video.duration}\n`;
      if (video.views) listMessage += `   👁️ Views: ${video.views}\n`;
      listMessage += `\n`;
    });
    
    listMessage += `━━━━━━━━━━━━━━━━\n`;
    listMessage += `💡 Reply with the number (1-${displayVideos.length}) to download the video.`;

    // Delete waiting message
    api.unsendMessage(waiting.messageID);
    
    // Send list and store in memory for reply handling
    api.sendMessage(listMessage, threadID, (err, info) => {
      if (err) return console.error(err);
      
      // Store videos in memory for this thread with the message ID
      if (!memory[threadID].videoLists) memory[threadID].videoLists = {};
      memory[threadID].videoLists[info.messageID] = {
        videos: displayVideos, // Store only the displayed videos
        allVideos: videos,
        page: page,
        expires: Date.now() + 300000 // 5 minutes expiry
      };
    });

  } catch (err) {
    console.error("Katorsex Command Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};

// Handle replies to download selected video
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;
  
  try {
    // Get stored videos
    if (!memory[threadID] || !memory[threadID].videoLists) {
      return api.sendMessage("❌ Video list expired. Please search again.", threadID, messageID);
    }

    const choice = parseInt(body);
    const videoData = memory[threadID].videoLists[handleReply.messageID];
    
    if (!videoData) {
      return api.sendMessage("❌ This video list has expired. Please search again.", threadID, messageID);
    }

    if (isNaN(choice) || choice < 1 || choice > videoData.videos.length) {
      return api.sendMessage(`❌ Please reply with a valid number between 1 and ${videoData.videos.length}.`, threadID, messageID);
    }

    const selectedVideo = videoData.videos[choice - 1];
    
    // Get user name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // FIXED: The video URL might be in different fields
    let videoUrl = null;
    
    if (selectedVideo.videoUrl) {
      videoUrl = selectedVideo.videoUrl;
    } else if (selectedVideo.downloadUrl) {
      videoUrl = selectedVideo.downloadUrl;
    } else if (selectedVideo.url) {
      videoUrl = selectedVideo.url;
    } else if (selectedVideo.link) {
      videoUrl = selectedVideo.link;
    } else if (selectedVideo.video) {
      videoUrl = selectedVideo.video;
    }

    if (!videoUrl) {
      console.log("Selected video:", selectedVideo);
      return api.sendMessage("❌ Video URL not found in API response.", threadID, messageID);
    }

    const downloading = await api.sendMessage(`⏳ Downloading: ${selectedVideo.title}...`, threadID, messageID);

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
          'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
          'Referer': 'https://betadash-api-swordslush-production.up.railway.app/'
        }
      });

      fs.writeFileSync(videoPath, videoResponse.data);
      
      // Get file size
      const stats = fs.statSync(videoPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Delete downloading message
      api.unsendMessage(downloading.messageID);

      // Send the video
      api.sendMessage(
        {
          body: `🎬 **KATORSEX VIDEO**\n━━━━━━━━━━━━━━━━\n` +
                `**Title:** ${selectedVideo.title}\n` +
                `**Size:** ${fileSizeMB} MB\n` +
                `**Page:** ${videoData.page}\n` +
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
      if (!memory[threadID].videos) memory[threadID].videos = [];
      memory[threadID].videos.push({
        user: senderName,
        title: selectedVideo.title,
        time: Date.now()
      });

    } catch (downloadErr) {
      console.error("Download error:", downloadErr);
      api.unsendMessage(downloading.messageID);
      api.sendMessage(`❌ Failed to download video: ${downloadErr.message}`, threadID, messageID);
    }

  } catch (err) {
    console.error("Katorsex Reply Error:", err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
