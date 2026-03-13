const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "spotify",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Selov",
  description: "Download and send MP3 songs",
  commandCategory: "music",
  usages: "spotify <song name>",
  cooldowns: 5
};

// Simple memory per thread
const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const query = args.join(" ").trim();

  try {
    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} requested: ${query}`);

    if (!query) {
      return api.sendMessage(
        "🎵 Please enter a song name.\n\nExample: spotify Umaasa", 
        threadID, 
        messageID
      );
    }

    api.sendMessage("🔍 Searching and downloading MP3...", threadID, messageID);

    // Using a YouTube to MP3 API (you need to find a reliable one)
    // Option A: Try this free API first
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=YOUR_YOUTUBE_API_KEY&maxResults=1&type=video`;
    
    // Option B: Alternative free API for testing
    const apiUrl = `https://api.dipto.xyz/api/yt?query=${encodeURIComponent(query)}&type=audio`;
    
    const res = await axios.get(apiUrl);
    
    if (!res.data || !res.data.audio) {
      return api.sendMessage("❌ Could not find or download the song.", threadID, messageID);
    }

    const audioUrl = res.data.audio;
    const title = res.data.title || query;
    const artist = res.data.artist || "Unknown";

    // Create cache directory if it doesn't exist
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Download MP3
    const mp3Path = path.join(cacheDir, `spotify_${Date.now()}.mp3`);
    const audioRes = await axios.get(audioUrl, { 
      responseType: "arraybuffer",
      timeout: 30000 
    });

    fs.writeFileSync(mp3Path, audioRes.data);

    // Send MP3 file
    api.sendMessage(
      {
        body: `🎵 SONG FOUND\n━━━━━━━━━━━━━━━━\nTitle: ${title}\nArtist: ${artist}\n\n📥 Sending MP3 file...`,
        attachment: fs.createReadStream(mp3Path)
      },
      threadID,
      (err) => {
        if (err) console.error("Error sending message:", err);
        // Clean up file
        try {
          if (fs.existsSync(mp3Path)) {
            fs.unlinkSync(mp3Path);
          }
        } catch (e) {
          console.error("Error deleting file:", e);
        }
      },
      messageID
    );

    memory[threadID].push(`Sent MP3: ${title}`);

  } catch (err) {
    console.error("Spotify Command Error:", err);
    
    api.sendMessage(
      `❌ Error: ${err.message}\n\nTry using a different song name.`,
      threadID,
      messageID
    );
  }
};
