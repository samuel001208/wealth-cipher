const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GOLD_WORDS = new Set([
  'power','mind','wealth','elite','rich','discipline','control','ancient','truth',
  'wisdom','strong','money','success','fear','weak','slave','empire','legacy',
  'sovereign','stoic','philosopher','marcus','aurelius','socrates','plato',
  'warrior','conquer','silence','focus','sacrifice','loyalty','honor','greatness',
  'dominant','rare','bold','unstoppable','code','cipher','virtue','steel',
  'darkness','rise','throne','blood','glory','chosen','king','divine','strength',
  'ancient','fire','gold','purpose','clarity','patience','rich','rome','greek'
]);

function buildASS(segments) {
  // ASS subtitle format with Cinzel-style font, lower third, gold power words
  const W = 1080, H = 1920;
  const marginV = 220; // distance from bottom for caption area
  const watermarkMarginV = 30; // distance from very bottom for watermark

  let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
`;

  // Main caption style - white, Cinzel, lower third, bold
  ass += `Style: Main,Cinzel,15,&H00FFFFFF,&H000000FF,&H00000000,&H99000000,1,0,0,0,100,100,2,0,1,2,1,2,60,60,${marginV},1\n`;
  // Gold word style
  ass += `Style: Gold,Cinzel,15,&H0000AAFF,&H000000FF,&H00000000,&H99000000,1,0,0,0,100,100,2,0,1,2,1,2,60,60,${marginV},1\n`;
  // Watermark style - small, white, very bottom
  ass += `Style: Watermark,Cinzel,9,&H00FFFFFF,&H000000FF,&H00000000,&H99000000,0,0,0,0,100,100,1,0,1,1,0,2,60,60,${watermarkMarginV},1\n`;

  ass += `\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n`;

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const cs = Math.floor((s % 1) * 100);
    return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  };

  let currentTime = 0;
  let totalDuration = 0;
  segments.forEach(s => { totalDuration += (s.audioDuration || 5) + 0.2; });

  for (const seg of segments) {
    if (!seg || !seg.text) continue;
    const duration = seg.audioDuration || 5;
    const start = currentTime;
    const end = currentTime + duration;
    currentTime = end + 0.2;

    // Build text with gold highlights for power words
    // Split text into words and wrap gold words in override tags
    const words = seg.text.split(' ');
    const styledWords = words.map(word => {
      const clean = word.toLowerCase().replace(/[^a-z]/g, '');
      if (GOLD_WORDS.has(clean)) {
        return `{\\c&H0000AAFF&}${word}{\\c&H00FFFFFF&}`;
      }
      return word;
    });
    const styledText = styledWords.join(' ');

    ass += `Dialogue: 0,${fmt(start)},${fmt(end)},Main,,0,0,0,,${styledText}\n`;
  }

  // Add permanent watermark
  ass += `Dialogue: 0,${fmt(0)},${fmt(totalDuration + 2)},Watermark,,0,0,0,,Edited And Voiced By Wealth Cipher\n`;

  return ass;
}

async function addCaptions(videoPath, segments, outputPath) {
  const processedDir = path.join(__dirname, '..', 'storage', 'processed');
  fs.mkdirSync(processedDir, { recursive: true });

  const assPath = path.join(processedDir, 'captions.ass');
  const assContent = buildASS(segments);
  fs.writeFileSync(assPath, assContent, 'utf8');
  console.log('ASS file saved:', assPath);

  // Install Cinzel font if not present
  try {
    execSync('fc-list | grep -i cinzel', { stdio: 'pipe' });
    console.log('Cinzel font found');
  } catch(e) {
    console.log('Installing Cinzel font...');
    execSync('pip install fonttools -q || true', { stdio: 'inherit' });
    execSync('apt-get install -y fonts-open-sans 2>/dev/null || true', { stdio: 'inherit' });
    // Download Cinzel font
    execSync('apt-get install -y fonts-urw-base35 2>/dev/null || true; mkdir -p /usr/share/fonts/cinzel && wget --tries=3 -q -O /usr/share/fonts/cinzel/Cinzel-Bold.ttf "https://github.com/NDISCOVER/Cinzel/raw/main/fonts/ttf/Cinzel-Bold.ttf" && fc-cache -f || true', { stdio: 'inherit' });
    console.log('Cinzel font installed');
  }

  // Burn ASS captions into video
  const assEscaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\\\:');
  const captionCmd = `ffmpeg -y -i "${videoPath}" -vf "ass='${assEscaped}'" -c:a copy "${outputPath}"`;
  console.log('Burning captions...');
  execSync(captionCmd, { stdio: 'inherit' });
  console.log('Captions burned:', outputPath);
  return outputPath;
}

module.exports = { addCaptions };
