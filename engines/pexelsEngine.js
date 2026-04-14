const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cinematic fallback queries — dark, powerful, moody
const CINEMATIC_FALLBACKS = [
  'dark ancient temple cinematic',
  'stormy sky lightning cinematic',
  'warrior silhouette sunset',
  'rome colosseum dark dramatic',
  'burning fire dark background',
  'dark forest fog cinematic',
  'ocean waves dramatic storm',
  'mountain peak clouds cinematic'
];

async function fetchVideosForSegments(segments) {
  const videoDir = path.join(__dirname, '..', 'storage', 'videos');
  fs.mkdirSync(videoDir, { recursive: true });

  const videoPaths = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const duration = segment.audioDuration || 6;
    const keyword = segment.keyword || 'ancient dark cinematic';
    // Append cinematic qualifier to every search
    const searchQuery = keyword + ' cinematic dark';

    console.log('Fetching video for segment ' + (i+1) + ': "' + searchQuery + '" (' + duration.toFixed(2) + 's)');

    let videoFile = null;
    let attempts = [searchQuery, CINEMATIC_FALLBACKS[i % CINEMATIC_FALLBACKS.length], 'dark cinematic dramatic'];

    for (const query of attempts) {
      try {
        const response = await axios.get('https://api.pexels.com/videos/search', {
          headers: { Authorization: process.env.PEXELS_API_KEY },
          params: { query, per_page: 10, orientation: 'portrait' }
        });
        const videos = response.data.videos;
        if (videos && videos.length > 0) {
          // Pick a random one from results for variety
          const pick = videos[Math.floor(Math.random() * videos.length)];
          videoFile = pick.video_files.find(f => f.quality === 'hd') || pick.video_files[0];
          break;
        }
      } catch(err) {
        console.error('Pexels fetch error (query: ' + query + '):', err.message);
      }
    }

    if (!videoFile) throw new Error('No video found for segment ' + (i+1));

    // Download the clip
    const clipPath = path.join(videoDir, 'clip_' + i + '.mp4');
    execSync('wget -q --tries=3 -O "' + clipPath + '" "' + videoFile.link + '"');

    // Trim clip to exact segment duration + small buffer
    const trimmed = path.join(videoDir, 'trimmed_' + i + '.mp4');
    execSync('ffmpeg -y -i "' + clipPath + '" -t ' + (duration + 0.3) + ' -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:v libx264 -preset ultrafast -an "' + trimmed + '"');

    videoPaths.push(trimmed);
    console.log('Clip ' + (i+1) + ' ready: ' + trimmed);
  }

  return videoPaths;
}

module.exports = { fetchVideosForSegments };
