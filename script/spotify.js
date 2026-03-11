const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "spotify",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Play songs with cover",
  commandCategory: "music",
  usages: "spotify <song title>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID } = event;

  const query = args.join(" ");

  if (!query) {
    return api.sendMessage(
      "🎵 Please enter a song name.\n\nExample:\nspotify heaven knows",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("🔎 Searching song...", threadID, messageID);

    const search = await axios.get(
      `https://doux.gleeze.com/search/mp3search?query=${encodeURIComponent(query)}`
    );

    const video = search.data.results.videos[0];

    if (!video) {
      return api.sendMessage("❌ Song not found.", threadID, messageID);
    }

    const title = video.title;
    const channel = video.channelTitle;
    const duration = video.duration;
    const thumb = video.thumbHigh || video.thumbMedium || video.thumbDefault;
    const videoId = video.id;

    const audioUrl = `https://doux.gleeze.com/download/ytmp3?id=${videoId}`;

    const audioPath = path.join(__dirname, "cache", `spotify_${Date.now()}.mp3`);
    const coverPath = path.join(__dirname, "cache", `cover_${Date.now()}.jpg`);

    // download audio
    const audio = await axios.get(audioUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(audioPath, audio.data);

    // download cover
    const cover = await axios.get(thumb, { responseType: "arraybuffer" });
    fs.writeFileSync(coverPath, cover.data);

    api.sendMessage(
      {
        body:
`🎵 Now Playing

Title: ${title}
Channel: ${channel}
Duration: ${duration}`,
        attachment: [
          fs.createReadStream(coverPath),
          fs.createReadStream(audioPath)
        ]
      },
      threadID,
      () => {
        fs.unlinkSync(audioPath);
        fs.unlinkSync(coverPath);
      },
      messageID
    );

  } catch (err) {

    console.error(err);

    api.sendMessage(
      "❌ Failed to fetch the song.",
      threadID,
      messageID
    );
  }
};