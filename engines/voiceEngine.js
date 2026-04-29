const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

async function generateVoice(text, outputPath) {
  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const pythonScript = `
import sys
from gtts import gTTS

text = sys.argv[1]
output = sys.argv[2]

tts = gTTS(text=text, lang='en', slow=False)
tts.save(output)
print('Voice generated successfully')
`;

    const scriptPath = path.join(__dirname, '../storage/temp/tts_script.py');
    await fs.mkdir(path.dirname(scriptPath), { recursive: true });
    await fs.writeFile(scriptPath, pythonScript);

    console.log('  Generating voice with gTTS...');
    execSync(`python3 ${scriptPath} "${text.replace(/"/g, '\\"')}" ${outputPath}`, {
      stdio: 'inherit'
    });

    console.log(`✓ Voice saved to: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('Error generating voice:', error.message);
    
    if (error.message.includes('No module named')) {
      console.error('\n⚠️  gTTS not installed. Run: pip3 install gTTS');
    }
    
    throw error;
  }
}

module.exports = { generateVoice };