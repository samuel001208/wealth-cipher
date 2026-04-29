const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

async function buildVideo({ quote, philosopher, voicePath, outputPath }) {
  const images = fs.readdirSync('assets/images').filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  const music = fs.readdirSync('assets/music').filter(f => /\.(mp3|wav)$/i.test(f));
  const used = JSON.parse(fs.readFileSync('storage/used.json', 'utf8'));

  // Pick random music
  const randomMusic = music[Math.floor(Math.random() * music.length)];
  const musicPath = path.join('assets/music', randomMusic);

  // Get voice duration
  const voiceDuration = await getDuration(voicePath);
  const videoDuration = voiceDuration;

  // Pick random unused images
  const availableImages = images.filter(img => !used.images.includes(img));
  if (availableImages.length < 30) {
    used.images = []; // Reset when 70% used
    fs.writeFileSync('storage/used.json', JSON.stringify(used, null, 2));
  }

  const imagesToUse = [];
  const photosNeeded = Math.ceil(videoDuration / 0.3);
  for (let i = 0; i < photosNeeded && availableImages.length > 0; i++) {
    const idx = Math.floor(Math.random() * availableImages.length);
    imagesToUse.push(availableImages.splice(idx, 1)[0]);
  }

  // Track used images
  used.images.push(...imagesToUse);
  fs.writeFileSync('storage/used.json', JSON.stringify(used, null, 2));

  // Build video using FFmpeg complex filter
  const W = 1080;
  const H = 1920;
  const photoW = 1920;
  const photoH = 1080;
  const photoY = (H - photoH) / 2;

  // Create slideshow with Ken Burns
  let filterComplex = '';
  imagesToUse.forEach((img, i) => {
    const duration = 0.3;
    filterComplex += `[${i}:v]scale=1920:1080,zoompan=z='zoom+0.002':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=1920x1080:fps=25[v${i}];`;
  });

  // Concatenate all
  filterComplex += imagesToUse.map((_, i) => `[v${i}]`).join('') + `concat=n=${imagesToUse.length}:v=1:a=0[photos];`;
  
  // Place photos in center with black bars
  filterComplex += `[photos]pad=1080:1920:0:${photoY}:black[video]`;

  const inputArgs = imagesToUse.map(img => ['-loop', '1', '-t', '0.3', '-i', path.join('assets/images', img)]).flat();

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    inputArgs.forEach(arg => cmd.input(arg));
    cmd.input(voicePath)
      .input(musicPath)
      .complexFilter(filterComplex)
      .outputOptions([
        '-map', '[video]',
        '-map', '0:a',
        '-map', '1:a',
        '-filter_complex', `[1:a]volume=1.0[voice];[2:a]volume=0.4[music];[voice][music]amix=inputs=2:duration=first[audio]`,
        '-map', '[audio]',
        '-t', videoDuration.toString(),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-c:a', 'aac',
        '-shortest'
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

module.exports = { buildVideo };