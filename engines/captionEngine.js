const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const POWER_WORDS = ['power','discipline','silence','wealth','ancient','mind','strength','wisdom','control','rich','money','success','focus','stoic','philosopher','empire','legacy','patience','clarity','purpose','king','throne','fire','gold'];

function generateSRT(segments) {
  let srt = '';
  let index = 1;
  let currentTime = 0;

  for (const seg of segments) {
    if (!seg || !seg.text) continue;
    const words = seg.text.split(' ');
    const segDuration = Math.max(4, words.length * 0.42);
    const start = currentTime;
    const end = currentTime + segDuration;

    const fmt = (s) => {
      const h = Math.floor(s / 3600).toString().padStart(2, '0');
      const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
      const sec = Math.floor(s % 60).toString().padStart(2, '0');
      const ms = Math.floor((s % 1) * 1000).toString().padStart(3, '0');
      return `${h}:${m}:${sec},${ms}`;
    };

    srt += `${index}\n${fmt(start)} --> ${fmt(end)}\n${seg.text}\n\n`;
    currentTime = end + 0.3;
    index++;
  }

  return srt;
}

async function addCaptions(videoPath, segments, outputPath) {
  const processedDir = path.join(__dirname, '..', 'storage', 'processed');
  fs.mkdirSync(processedDir, { recursive: true });

  const srtPath = path.join(processedDir, 'captions.srt');

  // Generate SRT file
  const srtContent = generateSRT(segments);
  fs.writeFileSync(srtPath, srtContent, 'utf8');
  console.log('SRT file saved:', srtPath);

  // Burn SRT captions into video using ffmpeg subtitles filter
  // Style: small white font, lower third, no background
  const srtEscaped = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const style = 'FontName=Arial,FontSize=18,PrimaryColour=&H00E8E0D5,OutlineColour=&H00000000,BackColour=&H80000000,Bold=0,Italic=0,Alignment=2,MarginV=60';
  const captionCmd = `ffmpeg -y -i "${videoPath}" -vf "subtitles='${srtPath}':force_style='${style}'" -c:a copy "${outputPath}"`;

  console.log('Burning captions into video...');
  execSync(captionCmd, { stdio: 'inherit' });
  console.log('Captions burned into video:', outputPath);

  return outputPath;
}

module.exports = { addCaptions };
