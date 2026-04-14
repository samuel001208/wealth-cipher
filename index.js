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

const LOG_FILE = path.join(__dirname, 'dashboard.json');
function readLog() { if (!fs.existsSync(LOG_FILE)) return []; return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); }
function writeLog(e) { fs.writeFileSync(LOG_FILE, JSON.stringify(e, null, 2)); }
function addLogEntry(entry) { const log = readLog(); log.unshift(entry); writeLog(log.slice(0, 30)); }
function normalizeError(err) {
  if (err && typeof err === 'object' && err.step) return { step: err.step, message: err.message || 'Unknown', details: err.details || null };
  return { step: 'UNKNOWN', message: (err && err.message) ? err.message : String(err), details: null };
}

async function runPipeline() {
  const logEntry = { date: new Date().toISOString(), status: 'processing', title: '', videoUrl: '', error: '' };
  console.log('WEALTH CIPHER AUTOMATION STARTED');
  try {
    console.log('STEP 1: Generating script...');
    const script = await generateScript();
    let { segments, title, description, tags } = script;
    logEntry.title = title;
    console.log('Script ready:', title);

    console.log('STEP 2: Generating voiceover per segment...');
    const { voicePath, segments: segWithDur } = await generateVoice(segments);
    segments = segWithDur;
    console.log('Voice ready:', voicePath);

    console.log('STEP 3: Fetching Pexels videos...');
    const videoPaths = await fetchVideosForSegments(segments);
    if (videoPaths.length === 0) throw new Error('No videos from Pexels');
    console.log('Videos ready:', videoPaths.length);

    console.log('STEP 4: Building video...');
    const storageDir = path.join(__dirname, 'storage');
    const allFiles = fs.readdirSync(storageDir);
    const musicFiles = allFiles.filter(f => f.endsWith('.mp3') && !f.startsWith('seg_') && f !== 'voice.mp3');
    const musicPath = musicFiles.length > 0 ? path.join(storageDir, musicFiles[Math.floor(Math.random() * musicFiles.length)]) : null;
    const outputVideoPath = path.join(storageDir, 'videos', 'output.mp4');
    const baseVideoPath = await buildVideo(videoPaths, voicePath, musicPath, outputVideoPath);
    console.log('Base video ready:', baseVideoPath);

    console.log('STEP 5: Adding captions...');
    const finalOutputPath = path.join(storageDir, 'videos', 'final.mp4');
    const finalVideoPath = await addCaptions(baseVideoPath, segments, finalOutputPath);
    console.log('Final video ready:', finalVideoPath);

    console.log('STEP 6: Uploading to YouTube...');
    const { videoUrl } = await uploadToYouTube({ videoPath: finalVideoPath, title, description, tags });
    logEntry.status = 'uploaded';
    logEntry.videoUrl = videoUrl;
    addLogEntry(logEntry);
    await sendSuccess({ title, videoUrl });
    console.log('DONE! URL:', videoUrl);

  } catch (err) {
    const n = normalizeError(err);
    console.error('Pipeline failed:', n.step, n.message);
    logEntry.status = 'failed';
    logEntry.error = n.message;
    addLogEntry(logEntry);
    await sendFailure({ step: n.step, message: n.message, details: n.details });
    process.exit(1);
  }
}

runPipeline();
