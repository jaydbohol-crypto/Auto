const axios = require("axios");

module.exports.config = {
  name: "pastebin",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "Yasis",
  description: "Upload text to Pastebin",
  commandCategory: "tools",
  usages: "pastebin <text> or reply to text",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {

  const { threadID, messageID, messageReply } = event;

  let text;

  // if replying to text
  if (messageReply && messageReply.body) {
    text = messageReply.body;
  }

  // if prompting text
  else if (args.length > 0) {
    text = args.join(" ");
  }

  if (!text) {
    return api.sendMessage(
      "📌 Please reply to a message or enter text to upload to Pastebin.",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("📄 Uploading text to Pastebin...", threadID, messageID);

    const apiUrl = `https://yin-api.vercel.app/tools/pastebin?text=${encodeURIComponent(text)}`;

    const res = await axios.get(apiUrl);

    const data = res.data;

    const pasteUrl =
      data.url ||
      data.result ||
      data.link ||
      data;

    if (!pasteUrl) {
      console.log("API RESPONSE:", data);
      return api.sendMessage(
        "❌ Failed to upload text.",
        threadID,
        messageID
      );
    }

    return api.sendMessage(
      `📄 Pastebin Uploaded\n\n🔗 ${pasteUrl}`,
      threadID,
      messageID
    );

  } catch (err) {

    console.error("Pastebin Error:", err);

    return api.sendMessage(
      "❌ Error uploading to Pastebin.",
      threadID,
      messageID
    );

  }

};