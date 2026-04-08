require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/youtube.upload'],
  prompt: 'consent',
});

console.log('\n========================================');
console.log('Open this URL in your browser:');
console.log('========================================\n');
console.log(authUrl);
console.log('\n========================================\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the code from Google here: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code.trim());
  console.log('\n YOUR REFRESH TOKEN:');
  console.log(tokens.refresh_token);
  console.log('\nAdd it to .env as YOUTUBE_REFRESH_TOKEN');
  rl.close();
});
