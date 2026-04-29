const { getQuote } = require('./engines/quoteEngine');
const { generateVoice } = require('./engines/voiceEngine');
const { buildVideo } = require('./engines/videoEngine');
const { uploadVideo } = require('./engines/uploadEngine');
const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

async function main() {
  try {
    console.log('🎬 Starting Wealth Cipher automation...\n');

    // 1. Get philosopher quote
    console.log('📖 Fetching philosopher quote...');
    const quoteData = await getQuote();
    console.log(`✅ Quote from ${quoteData.philosopher}: "${quoteData.quote}"`);
    console.log(`   Narration: "${quoteData.narration}"\n`);

    // 2. Generate voice
    console.log('🎙️  Generating voice narration...');
    const voicePath = 'storage/temp/voice.mp3';
    await generateVoice(quoteData.narration, voicePath);
    console.log(`✅ Voice generated\n`);

    // 3. Build video
    console.log('🎥 Building video with FFmpeg...');
    const videoPath = 'storage/temp/output.mp4';
    await buildVideo({
      quote: quoteData.quote,
      philosopher: quoteData.philosopher,
      voicePath,
      outputPath: videoPath
    });
    console.log(`✅ Video created: ${videoPath}\n`);

    // 4. Upload to YouTube
    console.log('📤 Uploading to YouTube...');
    const videoId = await uploadVideo({
      videoPath,
      title: quoteData.title,
      description: quoteData.description
    });
    console.log(`✅ Upload complete! Video ID: ${videoId}\n`);

    // Cleanup
    if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

    console.log('✅ Automation complete!');
  } catch (error) {
    console.error('❌ Error:', error);

    // Send email notification on failure
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'wealthcipher@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD || ''
      }
    });

    await transporter.sendMail({
      from: 'wealthcipher@gmail.com',
      to: 'samuelmendie01@gmail.com',
      subject: '❌ Wealth Cipher Automation Failed',
      text: `Error: ${error.message}\n\nStack: ${error.stack}`
    });

    process.exit(1);
  }
}

main();