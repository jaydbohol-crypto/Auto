const axios = require("axios");

module.exports.config = {
  name: "catbox",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Upload image to Catbox",
  commandCategory: "tools",
  usages: "catbox (reply to image or paste image URL)",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID, messageReply } = event;

  let imageUrl;

  // If replying to a photo
  if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
    const attachment = messageReply.attachments.find(a => a.type === "photo");

    if (attachment) {
      imageUrl = attachment.url;
    }
  }

  // If user provided URL
  if (!imageUrl && args.length > 0) {
    imageUrl = args[0];
  }

  if (!imageUrl) {
    return api.sendMessage(
      "📌 Please reply to an image or provide an image URL.",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("⬆️ Uploading image to Catbox...", threadID, messageID);

    const apiUrl = `https://yin-api.vercel.app/tools/catbox?image=${encodeURIComponent(imageUrl)}`;

    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.url) {
      return api.sendMessage(
        "❌ Failed to upload image.",
        threadID,
        messageID
      );
    }

    const catboxUrl = res.data.url;

    api.sendMessage(
      `📦 Image Uploaded\n\n🔗 ${catboxUrl}`,
      threadID,
      messageID
    );

  } catch (err) {

    console.error(err);

    api.sendMessage(
      "❌ Error uploading image.",
      threadID,
      messageID
    );

  }

};