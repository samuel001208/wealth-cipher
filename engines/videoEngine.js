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

  // Get voice duration so we know how long to make the video
  let voiceDuration = 50;
  try {
    const probe = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voicePath}"`, { encoding: 'utf8' });
    voiceDuration = parseFloat(probe.trim()) || 50;
  } catch(e) {}
  console.log('Voice duration:', voiceDuration, 'seconds');

  // Step 1: Process each clip with Ken Burns zoom + color grade, scaled to 1080x1920
  const processedClips = [];
  for (let i = 0; i < videoPaths.length; i++) {
    const clipOut = path.join(storage, `clip_${i}.mp4`);
    const duration = Math.ceil(voiceDuration / videoPaths.length) + 2;
    // Ken Burns: slow zoom from 1.0 to 1.05 over the clip duration
    // Color grade: warm desaturated dark look (eq + colorchannelmixer)
    const cmd = `ffmpeg -y -i "${videoPaths[i]}" -t ${duration} -vf "scale=1920:1080,zoompan=z='min(zoom+0.0008,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=1080x1920,eq=brightness=-0.06:saturation=0.75:contrast=1.1,colorchannelmixer=rr=1.05:gg=0.95:bb=0.85" -c:v libx264 -preset ultrafast -an "${clipOut}"`;
    execSync(cmd, { stdio: 'inherit' });
    processedClips.push(clipOut);
    console.log(`Clip ${i} processed with Ken Burns + color grade`);
  }

  // Step 2: Write concat list and join clips, loop last frame to fill voice duration
  const lines = processedClips.map(v => `file '${v}'`).join('\n');
  fs.writeFileSync(concatList, lines);

  // Concat + add vignette + limit to voice duration (last clip stretches to fill)
  const vignetteFilter = 'vignette=PI/2.2:mode=backward';
  const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatList}" -t ${voiceDuration} -vf "${vignetteFilter}" -c:v libx264 -preset ultrafast -an "${silentVideo}"`;
  execSync(concatCmd, { stdio: 'inherit' });
  console.log('Silent video built with vignette');

  // Step 3: Mix audio — voice 100% + music 20% with fade in/out
  if (musicPath && fs.existsSync(musicPath)) {
    const fadeDuration = 3;
    const musicFilter = `[1:a]volume=0.2,afade=t=in:st=0:d=${fadeDuration},afade=t=out:st=${Math.max(0, voiceDuration - fadeDuration)}:d=${fadeDuration}[music];[0:a]volume=1.0[voice];[voice][music]amix=inputs=2:duration=first[outa]`;
    const audioCmd = `ffmpeg -y -i "${voicePath}" -i "${musicPath}" -filter_complex "${musicFilter}" -map "[outa]" -c:a aac "${tmpAudio}"`;
    execSync(audioCmd, { stdio: 'inherit' });
  } else {
    execSync(`ffmpeg -y -i "${voicePath}" -c:a aac "${tmpAudio}"`, { stdio: 'inherit' });
  }
  console.log('Audio mixed with fade');

  // Step 4: Merge video + audio
  execSync(`ffmpeg -y -i "${silentVideo}" -i "${tmpAudio}" -c:v copy -c:a aac -shortest "${outputPath}"`, { stdio: 'inherit' });
  console.log('Video ready:', outputPath);

  // Cleanup
  [...processedClips, concatList, silentVideo, tmpAudio].forEach(f => { try { fs.unlinkSync(f); } catch(e) {} });
  return outputPath;
}

module.exports = { buildVideo };