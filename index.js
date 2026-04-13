require('dotenv').config();
const { generateScript } = require('./engines/scriptEngine');
const { fetchVideosForSegments } = require('./engines/pexelsEngine');
const { generateVoice } = require('./engines/voiceEngine');
const { buildVideo } = require('./engines/videoEngine');
const { addCaptions } = require('./engines/captionEngine');
const { uploadToYouTube } = require('./engines/uploadEngine');
const { sendSuccess, sendFailure } = require('./engines/alertEngine');
const fs = require('fs');
const path = require('path');

// Dashboard log file
const LOG_FILE = path.join(__dirname, 'dashboard.json');

function readLog() {
  if (!fs.existsSync(LOG_FILE)) return [];
  return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
}

function writeLog(entries) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(entries, null, 2));
}

function addLogEntry(entry) {
  const log = readLog();
  log.unshift(entry);
  writeLog(log.slice(0, 30)); // Keep last 30 entries
}


function normalizeError(err) {
  if (err && typeof err === 'object' && err.step) {
    return { step: err.step, message: err.message || 'Unknown error', details: err.details || null };
  }
  return {
    step: 'UNKNOWN',
    message: (err && err.message) ? err.message : String(err),
    details: null,
  };
}

async function runPipeline() {
  const logEntry = {
    date: new Date().toISOString(),
    status: 'processing',
    title: '',
    videoUrl: '',
    error: '',
  };

  console.log('\n============================');
  console.log('  WEALTH CIPHER AUTOMATION');
  console.log('============================\n');

  try {
    // STEP 1: Generate script
    console.log('STEP 1: Generating script...');
    const script = await generateScript(); const { segments, title, description, tags } = script; const fullScript = segments.map(s => s.text).join(' ');
    logEntry.title = title;
    console.log('Script ready. Segments:', segments.length);

    // STEP 2: Fetch Pexels videos
    console.log('\nSTEP 2: Fetching Pexels videos...');
    const videoPaths = await fetchVideosForSegments(segments);
    if (videoPaths.length === 0) throw new Error('No videos downloaded from Pexels');
    console.log('Videos ready:', videoPaths.length);

    // STEP 3: Generate voice
    console.log('\nSTEP 3: Generating voiceover...');
    const voicePath = await generateVoice(fullScript);
    console.log('Voice ready:', voicePath);

    // STEP 4: Build video
    console.log('\nSTEP 4: Building video...');
    const outputVideoPath = path.join(__dirname, 'storage', 'videos', 'output.mp4'); const baseVideoPath = await buildVideo(videoPaths, voicePath, null, outputVideoPath);
    console.log('Base video ready:', baseVideoPath);

    // STEP 5: Add captions
    console.log('\nSTEP 5: Adding captions...');
    const finalVideoPath = await addCaptions(segments, baseVideoPath);
    console.log('Final video ready:', finalVideoPath);

    // STEP 6: Upload to YouTube
    console.log('\nSTEP 6: Uploading to YouTube...');
    const { videoId, videoUrl } = await uploadToYouTube({
      videoPath: finalVideoPath,
      title,
      description,
      tags,
    });

    // STEP 7: Send success alert
    logEntry.status = 'uploaded';
    logEntry.videoUrl = videoUrl;
    addLogEntry(logEntry);
    await sendSuccess({ title, videoUrl });

    console.log('\n============================');
    console.log('  DONE! Video uploaded.');
    console.log('  URL:', videoUrl);
    console.log('============================\n');

  } catch (err) {
    const normalized = normalizeError(err);
    console.error('\nPipeline failed at step:', normalized.step);
    console.error('Error:', normalized.message);
    logEntry.status = 'failed';
    logEntry.error = normalized.message;
    addLogEntry(logEntry);
    await sendFailure({
      step: normalized.step,
      message: normalized.message,
      details: normalized.details,
    });
    process.exit(1);
  }
}

runPipeline();