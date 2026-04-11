require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const VIDEO_DIR = path.join(__dirname, '../storage/videos');

// Fallback keywords if a segment search returns nothing
const FALLBACK_KEYWORDS = [
  'dark luxury',
  'city night skyline',
  'wealthy lifestyle',
  'powerful man thinking',
  'dark cinematic',
];

async function searchPexelsVideo(keyword) {
  try {
    const response = await axios.get('https://api.pexels.com/videos/search', {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query: keyword, per_page: 5, orientation: 'portrait' },
    });
    const videos = response.data.videos;
    if (!videos || videos.length === 0) return null;
    // Pick a random video from results
    const video = videos[Math.floor(Math.random() * videos.length)];
    // Get the highest quality file
    const file = video.video_files.sort((a, b) => b.width - a.width)[0];
    return file.link;
  } catch (err) {
    console.error('Pexels search error for keyword:', keyword, err.message);
    return null;
  }
}

async function downloadVideo(url, filename) {
  const filePath = path.join(VIDEO_DIR, filename);
  const response = await axios({ url, method: 'GET', responseType: 'stream' });
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    writer.on('finish', () => resolve(filePath));
    writer.on('error', reject);
  });
}

async function fetchVideosForSegments(segments) {
  try {
  // Clear old videos first
  const files = fs.readdirSync(VIDEO_DIR);
  files.forEach(f => fs.unlinkSync(path.join(VIDEO_DIR, f)));

  const videoPaths = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    // Extract keyword from segment (first 3-4 words)
    const keyword = segment.split(' ').slice(0, 4).join(' ');
    console.log(`Segment ${i + 1} keyword: "${keyword}"`);

    let videoUrl = await searchPexelsVideo(keyword);

    // If no result, try fallback keyword
    if (!videoUrl) {
      console.log(`No result for "${keyword}", trying fallback...`);
      const fallback = FALLBACK_KEYWORDS[i % FALLBACK_KEYWORDS.length];
      videoUrl = await searchPexelsVideo(fallback);
    }

    if (!videoUrl) {
      console.error(`Could not find video for segment ${i + 1}, skipping.`);
      continue;
    }

    const filename = `video${i}.mp4`;
    console.log(`Downloading video${i}.mp4...`);
    const filePath = await downloadVideo(videoUrl, filename);
    videoPaths.push(filePath);
    console.log(`Saved: ${filePath}`);
  }

  return videoPaths;

  } catch (err) {
    throw {
      step: 'PEXELS_ENGINE',
      message: err.message || String(err),
      details: {
        code: err.code || null,
        status: (err.response && err.response.status) || null,
      },
    };
  }
}

module.exports = { fetchVideosForSegments };