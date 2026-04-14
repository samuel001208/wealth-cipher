const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function buildVideo(videoPaths, voicePath, musicPath, outputPath) {
  const storage = path.join(__dirname, '..', 'storage');
  fs.mkdirSync(storage, { recursive: true });
  fs.mkdirSync(path.join(storage, 'videos'), { recursive: true });

  const concatList = path.join(storage, 'concat.txt');
  const silentVideo = path.join(storage, 'silent.mp4');
  const tmpAudio = path.join(storage, 'mixed_audio.aac');

  let voiceDuration = 35;
  try {
    const probe = execSync('ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "' + voicePath + '"', { encoding: 'utf8' });
    voiceDuration = parseFloat(probe.trim()) || 35;
  } catch(e) {}
  console.log('Voice duration:', voiceDuration, 'seconds');

  const lines = videoPaths.map(v => "file '" + v + "'").join('\n');
  fs.writeFileSync(concatList, lines);

  const filters = 'vignette=PI/2.5:mode=backward,colorchannelmixer=rr=0.9:gg=0.85:bb=0.9';
  const concatCmd = 'ffmpeg -y -f concat -safe 0 -i "' + concatList + '" -t ' + voiceDuration + ' -vf "' + filters + '" -c:v libx264 -preset ultrafast -an "' + silentVideo + '"';
  execSync(concatCmd, { stdio: 'inherit' });
  console.log('Silent video built');

  if (musicPath && fs.existsSync(musicPath)) {
    const fade = 3;
    const mf = '[1:a]volume=0.2,afade=t=in:st=0:d=' + fade + ',afade=t=out:st=' + Math.max(0, voiceDuration - fade) + ':d=' + fade + '[music];[0:a]volume=1.0[voice];[voice][music]amix=inputs=2:duration=first[outa]';
    execSync('ffmpeg -y -i "' + voicePath + '" -i "' + musicPath + '" -filter_complex "' + mf + '" -map "[outa]" -c:a aac "' + tmpAudio + '"', { stdio: 'inherit' });
  } else {
    execSync('ffmpeg -y -i "' + voicePath + '" -c:a aac "' + tmpAudio + '"', { stdio: 'inherit' });
  }
  console.log('Audio mixed');

  execSync('ffmpeg -y -i "' + silentVideo + '" -i "' + tmpAudio + '" -c:v copy -c:a aac -shortest "' + outputPath + '"', { stdio: 'inherit' });
  console.log('Video ready:', outputPath);

  [concatList, silentVideo, tmpAudio].forEach(function(f) { try { fs.unlinkSync(f); } catch(e) {} });
  return outputPath;
}

module.exports = { buildVideo };
