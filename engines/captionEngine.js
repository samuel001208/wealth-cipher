require('dotenv').config();
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

const PROCESSED_DIR = path.join(__dirname, '../storage/processed');

function buildSRT(segments, totalDuration) {
  const timePerSegment = totalDuration / segments.length;
  let srt = '';

  segments.forEach((segment, i) => {
    const start = i * timePerSegment;
    const end = (i + 1) * timePerSegment;

    const fmt = (s) => {
      const h = Math.floor(s / 3600).toString().padStart(2, '0');
      const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
      const sec = Math.floor(s % 60).toString().padStart(2, '0');
      const ms = Math.floor((s % 1) * 1000).toString().padStart(3, '0');
      return `${h}:${m}:${sec},${ms}`;
    };

    srt += `${i + 1}\n${fmt(start)} --> ${fmt(end)}\n${segment}\n\n`;
  });

  return srt;
}

function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

async function addCaptions(segments, inputVideoPath) {
  try {
    console.log('Adding captions...');

    const duration = await getVideoDuration(inputVideoPath);
    const srtContent = buildSRT(segments, duration);

    const srtPath = path.join(PROCESSED_DIR, 'captions.srt');
    fs.writeFileSync(srtPath, srtContent);
    console.log('SRT file saved:', srtPath);

    const outputPath = path.join(PROCESSED_DIR, 'output.mp4');

    return new Promise((resolve, reject) => {
      ffmpeg(inputVideoPath)
        .outputOptions([
          `-vf subtitles=${srtPath.replace(/\\/g, '/')}:force_style='FontName=Arial,FontSize=18,PrimaryColour=&HFFFFFF,Bold=1,Alignment=2,MarginV=80,Outline=1,Shadow=0'`,
          '-c:a copy',
        ])
        .output(outputPath)
        .on('end', () => {
          console.log('Final video with captions:', outputPath);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('captionEngine error:', err.message);
          reject(err);
        })
        .run();
    });
  } catch (err) {
    console.error('captionEngine error:', err.message);
    throw err;
  }
}

module.exports = { addCaptions };