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
  'fire','gold','purpose','clarity','patience','rome','greek','zeus','spartan',
  'alexander','napoleon','stoicism','olympus','titan','legacy','conqueror'
]);

function buildASS(segments) {
  const W = 1080, H = 1920;
  // Lower third: 160px from bottom for captions, 28px for watermark
  const marginV = 160;
  const watermarkMarginV = 28;

  let ass = '[Script Info]\n';
  ass += 'ScriptType: v4.00+\n';
  ass += 'PlayResX: ' + W + '\n';
  ass += 'PlayResY: ' + H + '\n';
  ass += 'ScaledBorderAndShadow: yes\n\n';
  ass += '[V4+ Styles]\n';
  ass += 'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n';
  // Main: white, Cinzel, size 28, bold, bottom-center (alignment 2), shadow+outline
  ass += 'Style: Main,Cinzel,28,&H00FFFFFF,&H000000FF,&H00000000,&HAA000000,1,0,0,0,100,100,1,0,1,2,2,2,60,60,' + marginV + ',1\n';
  // Watermark: small, white, bottom-center
  ass += 'Style: Watermark,Cinzel,16,&H00FFFFFF,&H000000FF,&H00000000,&H88000000,0,0,0,0,100,100,0,0,1,1,1,2,60,60,' + watermarkMarginV + ',1\n';
  ass += '\n[Events]\n';
  ass += 'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n';

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const cs = Math.floor((s % 1) * 100);
    return h + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0') + '.' + String(cs).padStart(2,'0');
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

    // Build styled text with gold word overrides
    const words = seg.text.split(' ');
    const styledWords = words.map(word => {
      const clean = word.toLowerCase().replace(/[^a-z]/g, '');
      if (GOLD_WORDS.has(clean)) {
        return '{\\c&H0099FFFF&}' + word + '{\\c&H00FFFFFF&}';
      }
      return word;
    });
    const styledText = styledWords.join(' ');
    ass += 'Dialogue: 0,' + fmt(start) + ',' + fmt(end) + ',Main,,0,0,0,,' + styledText + '\n';
  }

  // Permanent watermark
  ass += 'Dialogue: 0,' + fmt(0) + ',' + fmt(totalDuration + 2) + ',Watermark,,0,0,0,,Edited And Voiced By Wealth Cipher\n';
  return ass;
}

async function addCaptions(videoPath, segments, outputPath) {
  const processedDir = path.join(__dirname, '..', 'storage', 'processed');
  fs.mkdirSync(processedDir, { recursive: true });

  const assPath = path.join(processedDir, 'captions.ass');
  fs.writeFileSync(assPath, buildASS(segments), 'utf8');
  console.log('ASS file saved:', assPath);

  // Install Cinzel font if needed
  try {
    execSync('fc-list | grep -i cinzel', { stdio: 'pipe' });
    console.log('Cinzel font already present');
  } catch(e) {
    console.log('Installing Cinzel font...');
    execSync('mkdir -p /usr/share/fonts/cinzel && wget -q --tries=3 -O /usr/share/fonts/cinzel/Cinzel-Bold.ttf "https://github.com/NDISCOVER/Cinzel/raw/main/fonts/ttf/Cinzel-Bold.ttf" && fc-cache -f || true', { stdio: 'inherit' });
  }

  // Burn captions using ffmpeg subtitles filter
  const safeAss = assPath.replace(/\\/g, '/').replace(/:/g, '\\\\:');
  const cmd = 'ffmpeg -y -i "' + videoPath + '" -vf "subtitles=\'' + safeAss + '\'" -c:a copy "' + outputPath + '"';
  console.log('Burning captions...');
  execSync(cmd, { stdio: 'inherit' });
  console.log('Captions burned:', outputPath);
  return outputPath;
}


function buildSRT(segments) {
  const fmtSRT = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 1000);
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0') + ',' + String(ms).padStart(3,'0');
  };
  let srt = '';
  let idx = 1;
  let currentTime = 0;
  for (const seg of segments) {
    const duration = seg.audioDuration || 5;
    const end = currentTime + duration;
    srt += idx + String.fromCharCode(10) + fmtSRT(currentTime) + ' --> ' + fmtSRT(end) + String.fromCharCode(10) + seg.text + String.fromCharCode(10) + String.fromCharCode(10);
    currentTime = end + 0.2;
    idx++;
  }
  return srt;
}

async function generateSRT(segments, outputPath) {
  fs.writeFileSync(outputPath, buildSRT(segments), 'utf8');
  return outputPath;
}
module.exports = { addCaptions, generateSRT };
