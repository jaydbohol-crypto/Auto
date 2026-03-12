const axios = require("axios")

module.exports = {
  name: "spotify",
  aliases: ["sp"],
  description: "Search Spotify and send playable audio",

  async execute(sock, m, args) {

    const query = args.join(" ")

    if (!query) {
      return sock.sendMessage(m.key.remoteJid, {
        text: "❌ Enter a song name."
      })
    }

    try {

      const url = `https://deku-api.giize.com/search/spotify?q=${encodeURIComponent(query)}`
      const { data } = await axios.get(url)

      if (!data.result || data.result.length === 0) {
        return sock.sendMessage(m.key.remoteJid, {
          text: "❌ Song not found."
        })
      }

      const song = data.result[0]

      const caption =
`🎵 *${song.title || "Unknown"}*
👤 Artist: ${song.artist || "Unknown"}
💿 Album: ${song.album || "Unknown"}

🔗 ${song.url || ""}`

      // Send cover image
      if (song.image) {
        await sock.sendMessage(m.key.remoteJid, {
          image: { url: song.image },
          caption
        }, { quoted: m })
      }

      // Send playable audio
      if (song.audio || song.preview || song.download) {

        const audioUrl =
          song.audio ||
          song.preview ||
          song.download

        await sock.sendMessage(m.key.remoteJid, {
          audio: { url: audioUrl },
          mimetype: "audio/mpeg",
          ptt: false
        }, { quoted: m })

      }

    } catch (err) {

      await sock.sendMessage(m.key.remoteJid, {
        text: "❌ Failed to fetch the song."
      })

    }

  }
}