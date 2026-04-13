const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function buildVideo(videoPaths, voicePath, musicPath, outputPath) {
  const storage = path.join(__dirname, '..', 'storage');
  fs.mkdirSync(storage, { recursive: true }); fs.mkdirSync(path.join(storage, 'videos'), { recursive: true }); const concatList = path.join(storage, 'concat.txt');
  const silentVideo = path.join(storage, 'silent.mp4');
  const tmpAudio = path.join(storage, 'mixed_audio.aac');

  // Step 1: Write concat list
  const listContent = videoPaths.map(v => `file '${v}'`).join('\n');
  fs.writeFileSync(concatList, listContent);
  console.log('Concat list written:', concatList);

  // Step 2: Concat video clips (no audio), scale to 1080x1920
  const cmd1 = `ffmpeg -y -f concat -safe 0 -i "${concatList}" -an -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset ultrafast "${silentVideo}"`;
  console.log('Running step 2: concat videos');
  execSync(cmd1, { stdio: 'inherit' });
  console.log('Silent video built');

  // Step 3: Mix audio (voice + background music)
  if (musicPath && fs.existsSync(musicPath)) {
    const cmd2 = `ffmpeg -y -i "${voicePath}" -i "${musicPath}" -filter_complex "[0:a]volume=1.0[v];[1:a]volume=0.1[m];[v][m]amix=inputs=2:duration=first[out]" -map "[out]" -c:a aac "${tmpAudio}"`;
    console.log('Running step 3: mix audio with music');
    execSync(cmd2, { stdio: 'inherit' });
  } else {
    const cmd2b = `ffmpeg -y -i "${voicePath}" -c:a aac "${tmpAudio}"`;
    console.log('Running step 3: convert voice audio only');
    execSync(cmd2b, { stdio: 'inherit' });
  }
  console.log('Audio ready');

  // Step 4: Merge video + audio
  const cmd3 = `ffmpeg -y -i "${silentVideo}" -i "${tmpAudio}" -c:v copy -c:a aac -shortest "${outputPath}"`;
  console.log('Running step 4: merge video + audio');
  execSync(cmd3, { stdio: 'inherit' });
  console.log('Video ready:', outputPath);

  // Cleanup temp files
  [concatList, silentVideo, tmpAudio].forEach(f => {
    try { fs.unlinkSync(f); } catch (e) {}
  });

  return outputPath;
}

module.exports = { buildVideo };