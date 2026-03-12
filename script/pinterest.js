const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "pinterest",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Search Pinterest images",
  commandCategory: "media",
  usages: "pinterest <query> [limit]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID } = event;

  if (!args.length) {
    return api.sendMessage(
      "📌 Please enter a search query.\n\nExample:\npinterest cats 5",
      threadID,
      messageID
    );
  }

  let limit = 5;
  const lastArg = args[args.length - 1];

  if (!isNaN(lastArg)) {
    limit = parseInt(lastArg);
    args.pop();
  }

  if (limit > 20) limit = 20;
  if (limit < 1) limit = 1;

  const query = args.join(" ");

  try {

    api.sendMessage("📌 Fetching Pinterest images...", threadID, messageID);

    const apiUrl = `https://deku-api.giize.com/search/pinterest?q=${encodeURIComponent(query)}`;

    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.result || res.data.result.length === 0) {
      return api.sendMessage("❌ No images found.", threadID, messageID);
    }

    const images = res.data.result.slice(0, limit);

    const attachments = [];

    for (let i = 0; i < images.length; i++) {

      const imgPath = path.join(__dirname, "cache", `pin_${Date.now()}_${i}.jpg`);

      const img = await axios.get(images[i], { responseType: "arraybuffer" });

      fs.writeFileSync(imgPath, img.data);

      attachments.push(fs.createReadStream(imgPath));
    }

    api.sendMessage(
      {
        body: `📌 Pinterest results for: ${query}\nImages: ${limit}`,
        attachment: attachments
      },
      threadID,
      () => {
        attachments.forEach(file => fs.unlinkSync(file.path));
      },
      messageID
    );

  } catch (err) {

    console.error(err);

    api.sendMessage(
      "❌ Failed to fetch Pinterest images.",
      threadID,
      messageID
    );
  }

};