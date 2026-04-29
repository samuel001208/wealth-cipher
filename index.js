require('dotenv').config();
const path = require('path');
const { generatePhilosopherQuote } = require('./engines/quoteEngine');
const { generateVoice } = require('./engines/voiceEngine');
const { createVideo } = require('./engines/videoEngine');
const { uploadToYouTube } = require('./engines/uploadEngine');

async function main() {
  try {
    console.log('\n────────────────────────────');
    console.log('🔥 SOPHOS - YouTube Shorts Automation');
    console.log('────────────────────────────\n');

    // Step 1: Generate philosopher quote
    console.log('1️⃣ Generating philosopher quote...');
    const quoteData = await generatePhilosopherQuote();

    // Step 2: Generate voice narration
    console.log('\n2️⃣ Generating voice narration...');
    const timestamp = Date.now();
    const voicePath = path.join(__dirname, 'storage/audio', `voice_${timestamp}.mp3`);
    await generateVoice(quoteData.fullNarration, voicePath);

    // Step 3: Create video
    console.log('\n3️⃣ Creating video...');
    const videoPath = path.join(__dirname, 'storage/output', `sophos_${timestamp}.mp4`);
    await createVideo(quoteData, voicePath, videoPath);

    // Step 4: Upload to YouTube
    console.log('\n4️⃣ Uploading to YouTube...');
    const title = `${quoteData.philosopher} on Wisdom | Sophos`;
    const description = quoteData.description + '\n\n#philosophy #wisdom #quotes #shorts';
    const uploadResult = await uploadToYouTube(videoPath, title, description);

    console.log('\n────────────────────────────');
    console.log('✅ SUCCESS!');
    console.log(`🎬 Video: ${uploadResult.url}`);
    console.log(`📅 Scheduled: ${uploadResult.scheduledTime.toLocaleString()}`);
    console.log('────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };