const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
	name: "onlytik",
	version: "1.0.0",
	role: 0,
	credits: "selov",
	description: "Generate a random TikTok video",
	usages: "[]",
	cooldown: 0,
	hasPrefix: true,
};

module.exports.run = async ({ api, event, args }) => {
	api.setMessageReaction("⏳", event.messageID, (err) => {}, true);
	api.sendTypingIndicator(event.threadID, true);

	const { messageID, threadID } = event;

	try {
		// Fetch video from the API
		const apiUrl = `https://haji-mix-api.gleeze.com/api/onlytik?stream=true`;
		const response = await axios.get(apiUrl);
		
		// Log the response to see the structure (for debugging)
		console.log("API Response:", JSON.stringify(response.data, null, 2));

		// Check different possible response structures
		let videoUrl = null;
		let videoTitle = "Random TikTok Video";
		let videoAuthor = "Unknown";
		
		if (response.data) {
			// Try to find video URL in different formats
			if (response.data.videoUrl) {
				videoUrl = response.data.videoUrl;
			} else if (response.data.playUrl) {
				videoUrl = response.data.playUrl;
			} else if (response.data.downloadUrl) {
				videoUrl = response.data.downloadUrl;
			} else if (response.data.url) {
				videoUrl = response.data.url;
			} else if (response.data.play) {
				videoUrl = response.data.play;
			} else if (response.data.video) {
				videoUrl = response.data.video;
			} else if (response.data.shotiurl) { // Your original code used shotiurl
				videoUrl = response.data.shotiurl;
			} else if (Array.isArray(response.data) && response.data.length > 0) {
				// If response is an array, take first item
				const firstItem = response.data[0];
				videoUrl = firstItem.videoUrl || firstItem.playUrl || firstItem.url;
				videoTitle = firstItem.title || firstItem.desc || "TikTok Video";
				videoAuthor = firstItem.author || firstItem.username || "Unknown";
			}
			
			// Try to get title and author if available
			if (response.data.title) videoTitle = response.data.title;
			if (response.data.desc) videoTitle = response.data.desc;
			if (response.data.author) videoAuthor = response.data.author;
			if (response.data.username) videoAuthor = response.data.username;
		}

		if (!videoUrl) {
			return api.sendMessage("❌ No video URL found in API response.", threadID, messageID);
		}

		// Create cache directory if it doesn't exist
		const cacheDir = path.join(__dirname, "cache");
		if (!fs.existsSync(cacheDir)) {
			fs.mkdirSync(cacheDir, { recursive: true });
		}

		// Video file path
		const videoPath = path.join(cacheDir, `onlytik_${Date.now()}.mp4`);

		// Download the video with proper headers
		const videoRes = await axios.get(videoUrl, { 
			responseType: "arraybuffer",
			timeout: 60000,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});

		// Save the video
		fs.writeFileSync(videoPath, videoRes.data);

		// Get file size
		const stats = fs.statSync(videoPath);
		const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

		// Send the video
		api.setMessageReaction("✅", event.messageID, (err) => {}, true);
		
		// Prepare message body
		let body = `🎵 RANDOM TIKTOK VIDEO\n━━━━━━━━━━━━━━━━\n`;
		body += `📹 Title: ${videoTitle}\n`;
		body += `👤 Author: ${videoAuthor}\n`;
		body += `📦 Size: ${fileSizeInMB} MB\n`;
		body += `━━━━━━━━━━━━━━━━\n`;
		body += `💬 Enjoy your random video!`;

		// Send with attachment
		api.sendMessage(
			{
				body: body,
				attachment: fs.createReadStream(videoPath)
			},
			threadID,
			(err) => {
				if (err) console.error("Error sending video:", err);
				// Clean up file
				try {
					if (fs.existsSync(videoPath)) {
						fs.unlinkSync(videoPath);
					}
				} catch (e) {
					console.error("Error deleting file:", e);
				}
			},
			messageID
		);

	} catch (err) {
		console.error("OnlyTik Error:", err);
		api.setMessageReaction("❌", event.messageID, (err) => {}, true);
		api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
	}
};
