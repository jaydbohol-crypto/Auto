const axios = require("axios");

module.exports.config = {
  name: "weather",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Selov",
  description: "check weather",
  commandCategory: "utility",
  usages: "weather <city name>",
  cooldowns: 3
};

const memory = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const city = args.join(" ").trim();

  try {
    if (!city) {
      return api.sendMessage("🌤️ Please provide a city name!", threadID, messageID);
    }

    const user = await api.getUserInfo(senderID);
    const senderName = user[senderID]?.name || "User";

    if (!memory[threadID]) memory[threadID] = [];
    memory[threadID].push(`${senderName} asked weather for: ${city}`);

    const apiUrl = `https://goweather.herokuapp.com/weather/${encodeURIComponent(city)}`;
    const res = await axios.get(apiUrl);
    const weather = res.data;

    if (!weather.temperature) {
      return api.sendMessage("❌ City not found!", threadID, messageID);
    }

    const reply = `🌍 Weather in ${city}\n━━━━━━━━━━━━━━\n🌡️ Temp: ${weather.temperature}\n💨 Wind: ${weather.wind}\n📝 Desc: ${weather.description || "N/A"}`;

    memory[threadID].push(`Weather result: ${weather.temperature}`);

    api.sendMessage(reply, threadID, messageID);

  } catch (err) {
    console.error(err);
    api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
  }
};
