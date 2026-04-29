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
  const videoDuration = voiceDuration + 1.5; // Add 1.5s for outro

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

  // Create video using simple approach - build slideshow then add text overlays
  const tempVideo = 'storage/temp/temp_video_no_text.mp4';
  
  // Step 1: Build base video (photos + Ken Burns + music + voice)
  await buildBaseVideo(imagesToUse, voicePath, musicPath, videoDuration, tempVideo);
  
  // Step 2: Add text overlays (quote on photo, philosopher name on bottom bar, outro)
  await addTextOverlays(tempVideo, quote, philosopher, voiceDuration, outputPath);
  
  // Cleanup temp
  if (fs.existsSync(tempVideo)) fs.unlinkSync(tempVideo);
  
  return outputPath;
}

async function buildBaseVideo(images, voicePath, musicPath, duration, outputPath) {
  return new Promise((resolve, reject) => {
    const inputArgs = [];
    images.forEach(img => {
      inputArgs.push('-loop', '1', '-t', '0.3', '-i', path.join('assets/images', img));
    });

    const filterComplex = [];
    
    // Apply Ken Burns to each image and scale to 1920x1080
    images.forEach((_, i) => {
      filterComplex.push(
        `[${i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,` +
        `zoompan=z='zoom+0.002':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=7.5:s=1920x1080:fps=25[v${i}]`
      );
    });
    
    // Concatenate all photos
    const concatInputs = images.map((_, i) => `[v${i}]`).join('');
    filterComplex.push(`${concatInputs}concat=n=${images.length}:v=1:a=0[photos]`);
    
    // Pad to 1080x1920 (9:16) with black bars
    filterComplex.push(`[photos]pad=1080:1920:0:420:black[video]`);

    const cmd = ffmpeg();
    
    inputArgs.forEach(arg => cmd.addInput(arg));
    cmd.addInput(voicePath);
    cmd.addInput(musicPath);
    
    cmd.complexFilter(filterComplex.join(';'))
      .outputOptions([
        '-map', '[video]',
        '-filter_complex', '[1:a]volume=1.0[voice];[2:a]volume=0.4,afade=t=out:st=' + (duration - 1.5) + ':d=1.5[music];[voice][music]amix=inputs=2:duration=first[a]',
        '-map', '[a]',
        '-t', duration.toString(),
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest'
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

async function addTextOverlays(inputVideo, quote, philosopher, voiceDuration, outputPath) {
  // For simplicity, we'll add static text. Word-by-word animation requires subtitle files or complex filter chains.
  // This version adds: quote text centered on photo, philosopher name at bottom right, outro card
  
  const fontPath = 'assets/fonts/Cinzel/static/Cinzel-Regular.ttf';
  
  // Build drawtext filters
  const filters = [];
  
  // Quote text - centered on photo area (y=420 to y=1500)
  const quoteY = 900; // Center of photo area
  filters.push(
    `drawtext=fontfile='${fontPath}':text='${escapeText(quote)}':` +
    `fontcolor=white:fontsize=48:x=(w-text_w)/2:y=${quoteY}:` +
    `shadowcolor=black:shadowx=2:shadowy=2:` +
    `enable='between(t,1,${voiceDuration})'`
  );
  
  // Philosopher name - bottom right of bottom bar (y > 1500)
  const philosopherY = 1750;
  filters.push(
    `drawtext=fontfile='${fontPath}':text='— ${escapeText(philosopher)}':` +
    `fontcolor=white:fontsize=36:x=w-text_w-50:y=${philosopherY}:` +
    `shadowcolor=black:shadowx=2:shadowy=2:` +
    `enable='between(t,1,${voiceDuration})'`
  );
  
  // Outro card - "Wealth Cipher" fades in last 1.5s
  const outroStart = voiceDuration;
  filters.push(
    `drawtext=fontfile='${fontPath}':text='Wealth Cipher':` +
    `fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h-text_h)/2:` +
    `shadowcolor=black:shadowx=3:shadowy=3:` +
    `alpha='if(lt(t,${outroStart}),0,if(lt(t,${outroStart + 0.5}),(t-${outroStart})*2,1))'`
  );

  return new Promise((resolve, reject) => {
    ffmpeg(inputVideo)
      .videoFilters(filters.join(','))
      .outputOptions(['-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'copy'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

function escapeText(text) {
  return text.replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:');
}

module.exports = { buildVideo };