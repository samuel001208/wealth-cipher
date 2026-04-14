const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function fetchVideosForSegments(segments) {
  const videoDir = path.join(__dirname, '..', 'storage', 'videos');
  fs.mkdirSync(videoDir, { recursive: true });

  const videoPaths = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const duration = segment.audioDuration || 6;
    // Use the AI-generated keyword directly — no suffix mixing
    const searchQuery = segment.keyword || 'ancient philosopher statue dark cinematic';

    console.log(`Fetching video for segment ${i + 1}: "${searchQuery}" (${duration.toFixed(2)}s)`);

    let videoFile = null;

    try {
      const response = await axios.get('https://api.pexels.com/videos/search', {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params: { query: searchQuery, per_page: 8, orientation: 'portrait' }
      });
      let videos = response.data.videos;

      // Fallback if nothing found
      if (!videos || videos.length === 0) {
        const fallback = await axios.get('https://api.pexels.com/videos/search', {
          headers: { Authorization: process.env.PEXELS_API_KEY },
          params: { query: 'ancient dark statue cinematic', per_page: 8, orientation: 'portrait' }
        });
        videos = fallback.data.videos;
      }

      const video = videos[Math.floor(Math.random() * videos.length)];
      videoFile = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];
    } catch (err) {
      console.error(`Pexels fetch error for segment ${i}:`, err.message);
      throw err;
    }

    // Download raw clip
    const rawPath = path.join(videoDir, `raw_${i}.mp4`);
    const writer = fs.createWriteStream(rawPath);
    const stream = await axios({ url: videoFile.link, method: 'GET', responseType: 'stream' });
    stream.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Trim clip to exact segment audio duration + scale to 1080x1920
    const trimmedPath = path.join(videoDir, `video${i}.mp4`);
    const trimCmd = `ffmpeg -y -i "${rawPath}" -t ${duration} -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.08:saturation=0.7:contrast=1.15" -c:v libx264 -preset ultrafast -an "${trimmedPath}"`;
    execSync(trimCmd, { stdio: 'inherit' });

    try { fs.unlinkSync(rawPath); } catch(e) {}

    console.log(`video${i}.mp4 saved (${duration.toFixed(2)}s)`);
    videoPaths.push(trimmedPath);
  }

  return videoPaths;
}

module.exports = { fetchVideosForSegments };
