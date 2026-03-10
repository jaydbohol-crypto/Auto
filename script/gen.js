const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "gen",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Generate AI images",
  commandCategory: "ai",
  usages: "gen <prompt>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID } = event;
  const prompt = args.join(" ");

  if (!prompt) {
    return api.sendMessage(
      "🖼 Please enter a prompt.\n\nExample:\n gen cyberpunk city",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("🎨 Generating your image... please wait.", threadID, messageID);

    const apiUrl = `https://yin-api.vercel.app/ai/aiart?prompt=${encodeURIComponent(prompt)}`;

    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.image) {
      return api.sendMessage("❌ Failed to generate image.", threadID, messageID);
    }

    const imageUrl = res.data.image;

    const imgPath = path.join(__dirname, "cache", `gen_${Date.now()}.jpg`);

    const img = await axios.get(imageUrl, { responseType: "arraybuffer" });

    fs.writeFileSync(imgPath, img.data);

    api.sendMessage(
      {
        body: `🖼 Image generated for:\n${prompt}`,
        attachment: fs.createReadStream(imgPath)
      },
      threadID,
      () => fs.unlinkSync(imgPath),
      messageID
    );

  } catch (err) {

    console.error(err);

    api.sendMessage(
      "❌ Error generating image.",
      threadID,
      messageID
    );
  }

};