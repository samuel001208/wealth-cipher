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
    const duration = segment.audioDuration || 5;
    console.log('Segment ' + (i+1) + ': searching greek statue (' + duration.toFixed(2) + 's)');

    let videoFile = null;
    try {
      const res = await axios.get('https://api.pexels.com/videos/search', {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params: { query: 'greek statue', per_page: 15, orientation: 'portrait' }
      });
      const videos = res.data.videos;
      if (videos && videos.length > 0) {
        const pick = videos[i % videos.length];
        videoFile = pick.video_files.find(f => f.quality === 'hd') || pick.video_files[0];
      }
    } catch(err) { console.error('Pexels error:', err.message); }


    const clipPath = path.join(videoDir, 'clip_' + i + '.mp4');
    execSync('wget -q --tries=3 -O "' + clipPath + '" "' + videoFile.link + '"');

    const trimmed = path.join(videoDir, 'trimmed_' + i + '.mp4');
    execSync('ffmpeg -y -i "' + clipPath + '" -t ' + duration + ' -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -preset ultrafast -an "' + trimmed + '"');

    videoPaths.push(trimmed);
    console.log('Clip ' + (i+1) + ' ready: ' + trimmed);
  }
  return videoPaths;
}

module.exports = { fetchVideosForSegments };