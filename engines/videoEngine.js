const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PHOTO_DIR = path.join(__dirname, '../assets/photos');
const MUSIC_DIR = path.join(__dirname, '../assets/music');
const OUTPUT_DIR = path.join(__dirname, '../storage/output');
const TEMP_DIR = path.join(__dirname, '../storage/temp');

// Track used photos to avoid repeats
let usedPhotos = [];
let allPhotos = [];

async function getRandomPhotos(count) {
  try {
    // Load all photos if not already loaded
    if (allPhotos.length === 0) {
      const files = await fs.readdir(PHOTO_DIR);
      allPhotos = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
      
      if (allPhotos.length === 0) {
        throw new Error('No photos found in assets/photos folder');
      }
    }

    // Reset used photos if we've used 70% of available photos
    const resetThreshold = Math.floor(allPhotos.length * 0.7);
    if (usedPhotos.length >= resetThreshold) {
      console.log('✓ Reset photo pool (70% used)');
      usedPhotos = [];
    }

    // Get available photos
    const available = allPhotos.filter(p => !usedPhotos.includes(p));
    
    // Select random photos
    const selected = [];
    for (let i = 0; i < Math.min(count, available.length); i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      const photo = available.splice(randomIndex, 1)[0];
      selected.push(path.join(PHOTO_DIR, photo));
      usedPhotos.push(path.basename(photo));
    }

    return selected;
  } catch (error) {
    console.error('Error selecting photos:', error.message);
    throw error;
  }
}

async function getRandomMusic() {
  try {
    const files = await fs.readdir(MUSIC_DIR);
    const musicFiles = files.filter(f => /\.(mp3|wav|m4a)$/i.test(f));
    
    if (musicFiles.length === 0) {
      throw new Error('No music files found in assets/music folder');
    }

    const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)];
    return path.join(MUSIC_DIR, randomMusic);
  } catch (error) {
    console.error('Error selecting music:', error.message);
    throw error;
  }
}

function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration);
    });
  });
}

async function createVideo(quoteData, voicePath, outputPath) {
  try {
    console.log('\n📹 Creating video...');
    
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Get voice duration
    const voiceDuration = await getAudioDuration(voicePath);
    console.log(`  Voice duration: ${voiceDuration.toFixed(2)}s`);

    // Calculate how many photos we need (0.3s each)
    const photosNeeded = Math.ceil(voiceDuration / 0.3);
    const photos = await getRandomPhotos(photosNeeded);
    console.log(`  Using ${photos.length} photos`);

    // Get random background music
    const musicPath = await getRandomMusic();
    console.log(`  Music: ${path.basename(musicPath)}`);

    // Create photo slideshow with Ken Burns effect (16:9)
    const slideshowPath = path.join(TEMP_DIR, 'slideshow.mp4');
    await createPhotoSlideshow(photos, voiceDuration, slideshowPath);

    // Add dark bars to make it 9:16
    const framedPath = path.join(TEMP_DIR, 'framed.mp4');
    await addDarkBars(slideshowPath, framedPath);

    // Add text overlays
    const withTextPath = path.join(TEMP_DIR, 'with_text.mp4');
    await addTextOverlays(framedPath, quoteData, voiceDuration, withTextPath);

    // Add audio (voice + music) and fade effects
    await addAudioAndFades(withTextPath, voicePath, musicPath, voiceDuration, outputPath);

    console.log(`✓ Video created: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('Error creating video:', error.message);
    throw error;
  }
}

async function createPhotoSlideshow(photos, duration, outputPath) {
  return new Promise((resolve, reject) => {
    const photoDuration = 0.3;
    let filterComplex = '';
    let inputs = [];

    photos.forEach((photo, i) => {
      inputs.push('-loop', '1', '-t', photoDuration.toString(), '-i', photo);
      
      // Ken Burns effect: random zoom and pan
      const zoomStart = 1.0;
      const zoomEnd = 1.1 + (Math.random() * 0.2);
      const xStart = Math.random() > 0.5 ? 0 : `iw-iw/${zoomEnd}`;
      const yStart = Math.random() > 0.5 ? 0 : `ih-ih/${zoomEnd}`;
      
      filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0015,${zoomEnd})':x='${xStart}':y='${yStart}':d=${photoDuration * 25}:s=1920x1080:fps=25[v${i}];`;
    });

    // Concatenate all videos
    filterComplex += photos.map((_, i) => `[v${i}]`).join('') + `concat=n=${photos.length}:v=1:a=0[outv]`;

    const args = [
      ...inputs.flat(),
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-t', duration.toString(),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y',
      outputPath
    ];

    const ffmpegProcess = exec(`ffmpeg ${args.join(' ')}`, (error) => {
      if (error) reject(error);
      else {
        console.log('  ✓ Slideshow created');
        resolve();
      }
    });
  });
}

async function addDarkBars(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Add black bars top and bottom to convert 16:9 (1920x1080) to 9:16 (1080x1920)
    const filterComplex = "[0:v]scale=1080:607,pad=1080:1920:0:656:black[v]";

    ffmpeg(inputPath)
      .outputOptions([
        '-filter_complex', filterComplex,
        '-map', '[v]',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p'
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('  ✓ Dark bars added (9:16)');
        resolve();
      })
      .on('error', reject)
      .run();
  });
}

async function addTextOverlays(inputPath, quoteData, duration, outputPath) {
  const quote = quoteData.quote.replace(/'/g, "'");
  const philosopher = quoteData.philosopher;
  
  // Split quote into words for progressive reveal
  const words = quote.split(' ');
  const wordDuration = (duration - 2) / words.length; // Leave 2s for outro
  
  let drawtext = '';
  
  // Add each word with fade-in effect
  words.forEach((word, i) => {
    const startTime = i * wordDuration;
    const fadeStart = startTime;
    const fadeDuration = 0.3;
    
    drawtext += `drawtext=text='${word}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=60:fontcolor=0xF5F5DC:x=(w-text_w)/2:y=(h-text_h)/2+${i*30-words.length*15}:enable='between(t,${fadeStart},${duration-2})':alpha='if(lt(t,${fadeStart+fadeDuration}),(t-${fadeStart})/${fadeDuration},1)',`;
  });
  
  // Add philosopher name at bottom right of dark bar
  drawtext += `drawtext=text='— ${philosopher}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:fontsize=40:fontcolor=white:x=w-text_w-50:y=h-200`;
  
  // Add channel name "Sophos" in last 2 seconds
  drawtext += `,drawtext=text='Sophos':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=80:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(t,${duration-2})':alpha='if(lt(t,${duration-1.5}),(t-(${duration-2}))/0.5,if(gt(t,${duration-0.5}),1-(t-(${duration-0.5}))/0.5,1))'`;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-vf', drawtext,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p'
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('  ✓ Text overlays added');
        resolve();
      })
      .on('error', reject)
      .run();
  });
}

async function addAudioAndFades(inputPath, voicePath, musicPath, duration, outputPath) {
  return new Promise((resolve, reject) => {
    const filterComplex = `
      [0:v]fade=t=in:st=0:d=1,fade=t=out:st=${duration-1}:d=1[v];
      [1:a]volume=1.0[voice];
      [2:a]volume=0.2,afade=t=in:st=0:d=1,afade=t=out:st=${duration-1}:d=1[music];
      [voice][music]amix=inputs=2:duration=first[a]
    `;

    ffmpeg()
      .input(inputPath)
      .input(voicePath)
      .input(musicPath)
      .outputOptions([
        '-filter_complex', filterComplex,
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('  ✓ Audio and fades added');
        resolve();
      })
      .on('error', reject)
      .run();
  });
}

module.exports = { createVideo };