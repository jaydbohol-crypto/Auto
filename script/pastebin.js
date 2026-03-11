const axios = require("axios");

module.exports.config = {
  name: "pastebin",
  version: "1.2.0",
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

  // reply support
  if (messageReply && messageReply.body) {
    text = messageReply.body;
  } 
  // prompt support
  else if (args.length > 0) {
    text = args.join(" ");
  }

  if (!text) {
    return api.sendMessage(
      "📌 Reply to a message or type text to upload.",
      threadID,
      messageID
    );
  }

  try {

    api.sendMessage("📄 Uploading text to Pastebin...", threadID, messageID);

    const apiUrl = `https://yin-api.vercel.app/tools/pastebin?text=${encodeURIComponent(text)}`;

    const res = await axios.get(apiUrl);

    const data = res.data;

    // extract URL safely
    const pasteUrl =
      data?.result?.url ||
      data?.url ||
      data?.result ||
      data?.link;

    if (!pasteUrl) {
      console.log("Pastebin API Response:", data);
      return api.sendMessage("❌ Failed to get Pastebin URL.", threadID, messageID);
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