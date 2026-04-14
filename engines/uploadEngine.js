require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  });
  return oauth2Client;
}

async function uploadToYouTube({ videoPath, title, description, tags }) {
  try {
  try {
    console.log('Uploading to YouTube...');
    const auth = getOAuthClient();
    const youtube = google.youtube({ version: 'v3', auth });

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title || 'Wealth Cipher | Dark Psychology',
          description: description || 'Dark psychology of wealth and power.',
          tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : ['wealth', 'philosophy', 'ancient wisdom', 'dark philosophy', 'stoic', 'power', 'discipline', 'wealth cipher']),
          categoryId: '22',
          defaultLanguage: 'en',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    const videoId = response.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('Uploaded successfully!');
    console.log('Video URL:', videoUrl);
  // Upload SRT caption track to suppress YouTube auto-captions
  try {
    const srtPath = require("path").join(__dirname, "..", "storage", "processed", "captions.srt");
    if (require("fs").existsSync(srtPath)) {
      await youtube.captions.insert({
        part: ["snippet"],
        requestBody: { snippet: { videoId, language: "en", name: "English", isDraft: false } },
        media: { mimeType: "text/plain", body: require("fs").createReadStream(srtPath) }
      });
      console.log("Caption track uploaded");
    }
  } catch(ce) { console.log("Caption upload skipped:", ce.message); }
    return { videoId, videoUrl };
  } catch (err) {
    console.error('uploadEngine error:', err.message);
    throw err;
  }

  } catch (err) {
    throw {
      step: 'UPLOAD_ENGINE',
      message: err.message || String(err),
      details: {
        code: err.code || null,
        status: (err.response && err.response.status) || null,
      },
    };
  }
}

module.exports = { uploadToYouTube };