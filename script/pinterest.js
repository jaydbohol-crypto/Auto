const axios = require("axios");

module.exports = {
  name: "pinterest",
  aliases: ["pin", "pins"],
  description: "Search and send Pinterest images",

  async run({ reply, args }) {

    if (!args.length) {
      return reply("❌ Enter a search query.");
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

      const url = `https://deku-api.giize.com/search/pinterest?q=${encodeURIComponent(query)}`;
      const { data } = await axios.get(url);

      if (!data.result || data.result.length === 0) {
        return reply("❌ No images found.");
      }

      const images = data.result.slice(0, limit);

      for (let img of images) {

        await reply.sendMessage({
          image: { url: img },
          caption: `📌 ${query}`
        });

      }

    } catch (err) {

      reply("❌ Failed to fetch images.");

    }

  }
};