const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "ytmp3",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "selov",
  description: "Download YouTube audio as MP3 (compressed)",
  commandCategory: "music",
  usages: "ytmp3 <song name>",
  cooldowns: 3
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const query = args.join(" ").trim();

  try {
    // Get sender name
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    // Initialize memory
    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} requested: ${query}`);

    if (!query) {
      return api.sendMessage(
        "🎵 Please enter a song name.\n\nExample: ytmp3 Umaasa", 
        threadID, 
        messageID
      );
    }

    const searching = await api.sendMessage("🔍 Searching and compressing audio...", threadID, messageID);

    // Your working API with limit 1 for first result
    const apiUrl = `https://haji-mix-api.gleeze.com/api/youtube?search=${encodeURIComponent(query)}&stream=false&limit=1`;
    
    const res = await axios.get(apiUrl);
    const videos = res.data;

    if (!videos || videos.length === 0) {
      return api.editMessage("❌ No videos found.", searching.messageID);
    }

    // Get the first video result
    const video = videos[0];
    
    // Get the audio URL from the play field
    const audioUrl = video.play;
    
    if (!audioUrl) {
      return api.editMessage("❌ No audio stream available.", searching.messageID);
    }

    // Update searching message
    api.editMessage(
      `📥 Downloading & compressing: ${video.title}\n⏱️ Duration: ${video.duration.timestamp}\n⚡ Target size: Under 2MB`, 
      searching.messageID
    );

    // Create cache directory
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download the audio file
    const audioPath = path.join(cacheDir, `yt_${Date.now()}.mp3`);
    const audioRes = await axios.get(audioUrl, { 
      responseType: "arraybuffer",
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    fs.writeFileSync(audioPath, audioRes.data);

    // Compress the audio file to reduce size
    const compressedPath = await compressAudio(audioPath);
    
    // Get file sizes
    const originalStats = fs.statSync(audioPath);
    const compressedStats = fs.statSync(compressedPath);
    
    const originalSizeMB = (originalStats.size / (1024 * 1024)).toFixed(2);
    const compressedSizeKB = (compressedStats.size / 1024).toFixed(2);
    const compressionRatio = ((originalStats.size - compressedStats.size) / originalStats.size * 100).toFixed(1);

    // Format view count
    const views = formatNumber(video.views);

    // Send the compressed audio file
    api.sendMessage(
      {
        body: `🎵 YOUTUBE MP3 (COMPRESSED)\n━━━━━━━━━━━━━━━━\n` +
              `🎤 Title: ${video.title}\n` +
              `👤 Channel: ${video.author.name}\n` +
              `⏱️ Duration: ${video.duration.timestamp}\n` +
              `👁️ Views: ${views}\n` +
              `━━━━━━━━━━━━━━━━\n` +
              `📦 Original: ${originalSizeMB} MB\n` +
              `🗜️ Compressed: ${compressedSizeKB} KB\n` +
              `⚡ Reduced by: ${compressionRatio}%\n` +
              `━━━━━━━━━━━━━━━━\n` +
              `🔗 Source: ${video.url}\n` +
              `💬 Requested by: ${senderName}`,
        attachment: fs.createReadStream(compressedPath)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending audio:", err);
        // Clean up files
        try {
          if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
          if (fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath);
        } catch (e) {
          console.error("Error deleting files:", e);
        }
      },
      messageID
    );

    // Update searching message
    api.editMessage(
      `✅ Compressed audio sent!\n` +
      `📦 Size: ${compressedSizeKB} KB (${compressionRatio}% smaller)`,
      searching.messageID
    );

    // Store in memory
    memory[threadID].push(`Downloaded: ${video.title} (${compressedSizeKB} KB)`);

  } catch (err) {
    console.error("YouTube MP3 Error:", err);
    
    return api.sendMessage(
      `❌ Error: ${err.message}`,
      threadID,
      messageID
    );
  }
};

// Helper function to compress audio using FFmpeg (you need ffmpeg installed)
async function compressAudio(inputPath) {
  const outputPath = inputPath.replace('.mp3', '_compressed.mp3');
  
  return new Promise((resolve, reject) => {
    // Using FFmpeg to compress audio
    // This reduces bitrate to 64kbps which significantly reduces file size
    const { exec } = require('child_process');
    
    // FFmpeg command: convert to mono, 64kbps bitrate for smallest size
    const command = `ffmpeg -i "${inputPath}" -ac 1 -b:a 64k -map_metadata -1 "${outputPath}" -y`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Compression error:", error);
        // If compression fails, return original file
        resolve(inputPath);
      } else {
        // Check if compressed file exists and is smaller
        if (fs.existsSync(outputPath)) {
          const originalSize = fs.statSync(inputPath).size;
          const compressedSize = fs.statSync(outputPath).size;
          
          // If compressed file is actually larger, use original
          if (compressedSize < originalSize) {
            resolve(outputPath);
          } else {
            // Clean up useless compressed file
            try { fs.unlinkSync(outputPath); } catch (e) {}
            resolve(inputPath);
          }
        } else {
          resolve(inputPath);
        }
      }
    });
  });
}

// Helper function to compress without FFmpeg (alternative method)
async function compressAudioSimple(inputPath) {
  // If FFmpeg is not available, we can't compress
  // But we can try to use the API's stream parameter for smaller files
  // For now, return original path
  return inputPath;
}

// Helper function to format numbers (views)
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
