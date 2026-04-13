const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const POWER_WORDS = ['power','discipline','silence','wealth','ancient','mind','strength','wisdom','control','rich','money','success','focus','stoic','philosopher','empire','legacy','patience','clarity','purpose','king','throne','fire','gold'];

function generateSRT(segments) {
  let srt = '';
  let index = 1;
  let currentTime = 0;
  const avgSecondsPerSegment = 8;

  for (const seg of segments) {
    const words = seg.text.split(' ');
    const segDuration = Math.max(4, words.length * 0.45);
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
  const assSrt = path.join(processedDir, 'captions.ass');

  // Generate SRT
  const srtContent = generateSRT(segments);
  fs.writeFileSync(srtPath, srtContent);
  console.log('SRT file saved:', srtPath);

  // Convert SRT to ASS for full style control
  try {
    execSync(`ffmpeg -y -i "${srtPath}" "${assSrt}"`, { stdio: 'pipe' });
  } catch(e) {}

  // Build Python script to modify ASS styles: milky white text, gold power words, small font, lower third
  const pythonScript = `
import re

POWER_WORDS = ${JSON.stringify(POWER_WORDS)}

with open('${assSrt}', 'r') as f:
    content = f.read()

# Update style: small font (32), milky white color, lower third position
content = re.sub(r'Fontsize:[0-9]+', 'Fontsize:32', content)
content = re.sub(r'PrimaryColour:&H[0-9A-Fa-f]+', 'PrimaryColour:&H00E8E0D5', content)  # milky white
content = re.sub(r'Alignment:[0-9]+', 'Alignment:2', content)  # bottom center
content = re.sub(r'MarginV:[0-9]+', 'MarginV:80', content)  # lower third spacing
content = content.replace('Bold:-1', 'Bold:0')
content = content.replace('Bold:1', 'Bold:0')

# Highlight power words in gold
def highlight_line(line):
    for word in POWER_WORDS:
        pattern = re.compile(r'\\b(' + re.escape(word) + r')\\b', re.IGNORECASE)
        line = pattern.sub(r'{\\c&H0045D4FF&}\\1{\\c&H00E8E0D5&}', line)
    return line

lines = content.split('\\n')
result = []
for line in lines:
    if not line.startswith('[') and not line.startswith('Style:') and not line.startswith('Format:') and ':' not in line[:6]:
        line = highlight_line(line)
    result.append(line)

with open('${assSrt}', 'w') as f:
    f.write('\\n'.join(result))
print('ASS captions styled successfully')
`;

  const pyPath = path.join(processedDir, 'style_captions.py');
  fs.writeFileSync(pyPath, pythonScript);
  execSync(`python3 "${pyPath}"`, { stdio: 'inherit' });

  // Burn captions into video
  const captionCmd = `ffmpeg -y -i "${videoPath}" -vf "ass='${assSrt.replace(/'/g, "'\\\''")}'" -c:a copy "${outputPath}"`;
  execSync(captionCmd, { stdio: 'inherit' });
  console.log('Captions burned into video:', outputPath);

  // Cleanup
  try { fs.unlinkSync(pyPath); } catch(e) {}

  return outputPath;
}

module.exports = { addCaptions };
