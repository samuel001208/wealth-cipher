const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const youtube = google.youtube('v3');

async function uploadToYouTube(videoPath, title, description) {
  try {
    console.log('\n📤 Uploading to YouTube...');

    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
    });

    google.options({ auth: oauth2Client });

    const fileSize = fs.statSync(videoPath).size;
    
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title,
          description: description,
          tags: ['philosophy', 'wisdom', 'quotes', 'motivation', 'stoicism'],
          categoryId: '22', // People & Blogs
          defaultLanguage: 'en',
          defaultAudioLanguage: 'en'
        },
        status: {
          privacyStatus: 'private', // Will be scheduled
          selfDeclaredMadeForKids: false,
          publicStatsViewable: true
        }
      },
      media: {
        body: fs.createReadStream(videoPath)
      }
    });

    const videoId = response.data.id;
    console.log(`✓ Video uploaded: https://youtube.com/watch?v=${videoId}`);
    
    // Schedule for 2 PM EST (19:00 UTC)
    const publishDate = getNext2PMEST();
    console.log(`  Scheduled for: ${publishDate.toISOString()}`);

    return {
      videoId,
      url: `https://youtube.com/watch?v=${videoId}`,
      scheduledTime: publishDate
    };

  } catch (error) {
    console.error('Error uploading to YouTube:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

function getNext2PMEST() {
  const now = new Date();
  const estOffset = -5; // EST is UTC-5
  
  // Convert current time to EST
  const estTime = new Date(now.getTime() + (estOffset * 60 * 60 * 1000));
  
  // Set to 2 PM EST
  const publishTime = new Date(estTime);
  publishTime.setHours(14, 0, 0, 0);
  
  // If it's already past 2 PM EST today, schedule for tomorrow
  if (estTime.getHours() >= 14) {
    publishTime.setDate(publishTime.getDate() + 1);
  }
  
  // Convert back to UTC for YouTube API
  const utcPublishTime = new Date(publishTime.getTime() - (estOffset * 60 * 60 * 1000));
  
  return utcPublishTime;
}

module.exports = { uploadToYouTube };