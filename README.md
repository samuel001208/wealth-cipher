# Sophos - YouTube Shorts Automation

Automated YouTube Shorts creator for philosophy quotes.

## Features

- **AI-Powered Quote Generation**: Uses Groq (llama-3.3-70b-versatile) to find authentic philosopher quotes
- **Sophisticated Introductions**: Randomly selects from vocabulary banks for varied, elegant intros
- **Voice Narration**: Google Text-to-Speech with customizable voice settings
- **Dynamic Video Creation**: FFmpeg-powered video generation with:
  - 9:16 vertical format (YouTube Shorts optimized)
  - Ken Burns photo effects
  - Word-by-word quote reveal synced with voice
  - Dark bars framing 16:9 content
  - Philosopher attribution
  - Channel name outro
- **Automated Upload**: Scheduled YouTube uploads at 2 PM EST daily

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Install FFmpeg
Make sure FFmpeg is installed on your system:
```bash
sudo apt-get install ffmpeg  # Ubuntu/Debian
```

### 3. Add Assets
- Place 100 images in `assets/photos/`
- Add background music files to `assets/music/`

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

Required:
- `GROQ_API_KEY` - Get from https://console.groq.com
- `GOOGLE_TTS_CREDENTIALS` - JSON credentials from Google Cloud
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` - OAuth credentials

## Usage

### Run Once
```bash
node index.js
```

### Automated Daily Upload
Use GitHub Actions or cron job to run daily at desired time.

## Project Structure

```
sophos/
├── engines/
│   ├── quoteEngine.js       # Groq AI quote generation
│   ├── voiceEngine.js       # Google TTS voice generation
│   ├── videoEngine.js       # FFmpeg video creation
│   └── uploadEngine.js      # YouTube API upload
├── assets/
│   ├── photos/              # Image assets (100+ photos)
│   └── music/               # Background music files
├── storage/
│   ├── audio/               # Generated voice files
│   ├── output/              # Final videos
│   └── temp/                # Temporary processing files
├── vocabulary.json          # Word banks for intros
├── index.js                 # Main orchestrator
└── .env                     # Environment variables
```

## Video Specifications

- **Resolution**: 1080x1920 (9:16)
- **Duration**: Dynamic (based on quote length)
- **Format**: MP4 (H.264 + AAC)
- **Effects**: Fade in/out, Ken Burns, word-by-word text reveal

## License

ISC
