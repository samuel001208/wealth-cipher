const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const MUSIC_DIR = path.join(__dirname, '../storage/music');
const PROCESSED_DIR = path.join(__dirname, '../storage/processed');

function getRandomMusic() {
  fs.mkdirSync(MUSIC_DIR, { recursive: true });
  const files = fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3'));
  if (!files.length) return null;
  return path.join(MUSIC_DIR, files[Math.floor(Math.random() * files.length)]);
}

async function buildVideo(videoPaths, voicePath) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  const baseVideoPath = path.join(PROCESSED_DIR, 'base_no_subs.mp4');
  const musicPath = getRandomMusic();
  const n = videoPaths.length;

  return new Promise((resolve, reject) => {
    console.log('Building video...');
    if (musicPath) console.log('Background music:', path.basename(musicPath));

    // Step 1: concat all video clips into one file first
    const listFile = path.join(PROCESSED_DIR, 'filelist.txt');
    const fileListContent = videoPaths.map(v => `file '${v}'`).join('\n');
    fs.writeFileSync(listFile, fileListContent);

    const concatPath = path.join(PROCESSED_DIR, 'concat_raw.mp4');

    const cmd1 = ffmpeg();
    cmd1
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .videoFilters([
        'scale=1080:1920:force_original_aspect_ratio=decrease',
        'pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
        'setsar=1',
        'fps=30'
      ])
      .outputOptions(['-an', '-c:v libx264', '-preset fast', '-crf 23'])
      .output(concatPath)
      .on('start', cmd => console.log('ffmpeg concat started...'))
      .on('end', () => {
        console.log('Video concat done');
        // Step 2: merge concat video + voice + music
        const cmd2 = ffmpeg();
        cmd2.input(concatPath);
        cmd2.input(voicePath);
        if (musicPath) cmd2.input(musicPath);

        let audioFilter;
        if (musicPath) {
          audioFilter = '[1:a]volume=1.0[voice];[2:a]volume=0.12[music];[voice][music]amix=inputs=2:duration=first[outa]';
        } else {
          audioFilter = '[1:a]volume=1.0[outa]';
        }

        cmd2
          .complexFilter(audioFilter)
          .outputOptions([
            '-map 0:v',
            '-map [outa]',
            '-c:v copy',
            '-c:a aac',
            '-shortest'
          ])
          .output(baseVideoPath)
          .on('start', cmd => console.log('ffmpeg merge started...'))
          .on('end', () => {
            console.log('Base video built:', baseVideoPath);
            resolve(baseVideoPath);
          })
          .on('error', (err) => reject(err))
          .run();
      })
      .on('error', (err) => reject(err))
      .run();
  });
}

module.exports = { buildVideo };
