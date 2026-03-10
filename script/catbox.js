const axios = require("axios");

module.exports.config = {
  name: "catbox",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Upload image to Catbox",
  commandCategory: "tools",
  usages: "reply to image or provide image URL",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID, messageReply } = event;

  let imageUrl;

  // reply image
  if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
    const attachment = messageReply.attachments.find(a => a.type === "photo");
    if (attachment) imageUrl = attachment.url;
  }

  // manual url
  if (!imageUrl && args[0]) {
    imageUrl = args[0];
  }

  if (!imageUrl) {
    return api.sendMessage(
      "📌 Reply to an image or provide an image URL.",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("⬆️ Uploading image to Catbox...", threadID, messageID);

    const apiUrl = `https://yin-api.vercel.app/tools/catbox?image=${encodeURIComponent(imageUrl)}`;

    const res = await axios.get(apiUrl);

    const data = res.data;

    // detect response format
    const catboxUrl =
      data.url ||
      data.result ||
      data.link ||
      data;

    if (!catboxUrl) {
      console.log("API RESPONSE:", data);
      return api.sendMessage("❌ Upload failed.", threadID, messageID);
    }

    return api.sendMessage(
      `📦 Image Uploaded to Catbox\n\n🔗 ${catboxUrl}`,
      threadID,
      messageID
    );

  } catch (err) {

    console.error("Catbox Error:", err.message);

    return api.sendMessage(
      "❌ Error uploading image.",
      threadID,
      messageID
    );

  }

};