require('dotenv').config();
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

const MUSIC_DIR = path.join(__dirname, '../storage/music');
const PROCESSED_DIR = path.join(__dirname, '../storage/processed');

function getRandomMusic() {
  const files = fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3'));
  if (files.length === 0) return null;
  const picked = files[Math.floor(Math.random() * files.length)];
  return path.join(MUSIC_DIR, picked);
}

function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

async function buildVideo(videoPaths, voicePath) {
  try {
  console.log('Building video...');

  const voiceDuration = await getVideoDuration(voicePath);
  console.log('Voice duration:', voiceDuration, 'seconds');

  const baseVideoPath = path.join(PROCESSED_DIR, 'base_no_subs.mp4');
  const musicPath = getRandomMusic();

  return new Promise((resolve, reject) => {
    let command = ffmpeg();

    // Add all video clips as inputs
    videoPaths.forEach(v => command.input(v));

    // Add voice as input
    command.input(voicePath);

    // Add music if available
    if (musicPath) {
      command.input(musicPath);
      console.log('Background music:', path.basename(musicPath));
    }

    const n = videoPaths.length;

    // Build filter complex
    let filterComplex = '';

    // Scale + crop each clip to 1080x1920 vertical
    for (let i = 0; i < n; i++) {
      filterComplex += `[${i}:v]scale=1920:1080,crop=1080:1920:420:0,setsar=1[v${i}];`;
    }

    // Concatenate all video clips
    filterComplex += videoPaths.map((_, i) => `[v${i}]`).join('') + `concat=n=${n}:v=1:a=0[concatv];`;

    // Apply dark vignette + contrast boost
    filterComplex += `[concatv]vignette=PI/4,eq=contrast=1.3:brightness=-0.05[finalv];`;

    if (musicPath) {
      // Mix voice (full volume) + music (15% volume)
      filterComplex += `[${n}:a]volume=1.0[voice];[${n + 1}:a]volume=0.12[music];[voice][music]amix=inputs=2:duration=first[finala]`;
    } else {
      filterComplex += `[${n}:a]volume=1.0[finala]`;
    }

    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map [finalv]',
        '-map [finala]',
        `-t ${voiceDuration}`,
        '-c:v libx264',
        '-c:a aac',
        '-shortest',
        '-r 30',
      ])
      .output(baseVideoPath)
      .on('start', cmd => console.log('FFmpeg started...'))
      .on('end', () => {
        console.log('Base video built:', baseVideoPath);
        resolve(baseVideoPath);
      })
      .on('error', (err) => {
        console.error('videoEngine error:', err.message);
        reject(err);
      })
      .run();
  });
}

  } catch (err) {
    throw {
      step: 'VIDEO_ENGINE',
      message: err.message || String(err),
      details: {
        code: err.code || null,
        status: (err.response && err.response.status) || null,
      },
    };
  }
}

module.exports = { buildVideo };