const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ANCIENT_SUFFIXES = [
  'Marcus Aurelius bust ancient sculpture',
  'Socrates philosopher marble statue',
  'Julius Caesar Roman sculpture dark',
  'Aristotle ancient Greek bust cinematic',
  'Stoic philosopher ancient marble',
  'Napoleon Bonaparte sculpture dramatic',
  'Plato ancient sculpture dark cinematic',
  'Roman emperor bust stone dramatic',
  'ancient Greek philosopher sculpture',
  'Confucius statue dramatic lighting',
  'Sun Tzu ancient warrior statue',
  'Shakespeare bust dramatic dark',
  'ancient dark cinematic statue power',
  'Seneca Roman philosopher sculpture',
  'Alexander the Great statue cinematic'
];

async function fetchVideosForSegments(segments) {
  const videoDir = path.join(__dirname, '..', 'storage', 'videos');
  fs.mkdirSync(videoDir, { recursive: true });

  const videoPaths = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const suffix = ANCIENT_SUFFIXES[i % ANCIENT_SUFFIXES.length];
    const rawKeyword = segment.keyword || 'ancient dark cinematic';
    const searchQuery = `${rawKeyword} ${suffix}`;

    console.log(`Fetching video for segment ${i + 1}: "${searchQuery}"`);

    try {
      const response = await axios.get('https://api.pexels.com/videos/search', {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params: { query: searchQuery, per_page: 5, orientation: 'portrait' }
      });

      let videos = response.data.videos;
      if (!videos || videos.length === 0) {
        // Fallback to just the ancient suffix
        const fallback = await axios.get('https://api.pexels.com/videos/search', {
          headers: { Authorization: process.env.PEXELS_API_KEY },
          params: { query: 'ancient dark cinematic statue', per_page: 5, orientation: 'portrait' }
        });
        videos = fallback.data.videos;
      }

      const video = videos[Math.floor(Math.random() * videos.length)];
      const videoFile = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];

      const videoPath = path.join(videoDir, `video${i}.mp4`);
      const writer = fs.createWriteStream(videoPath);
      const stream = await axios({ url: videoFile.link, method: 'GET', responseType: 'stream' });
      stream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log(`video${i}.mp4 saved`);
      videoPaths.push(videoPath);
    } catch (err) {
      console.error(`Error fetching video ${i}:`, err.message);
      throw err;
    }
  }

  return videoPaths;
}

module.exports = { fetchVideosForSegments };
