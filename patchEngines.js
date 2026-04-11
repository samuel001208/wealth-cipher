const fs = require('fs');

const engines = [
  'engines/scriptEngine.js',
  'engines/uploadEngine.js',
  'engines/videoEngine.js',
  'engines/voiceEngine.js',
];

engines.forEach(filePath => {
  let src = fs.readFileSync(filePath, 'utf8');

  // The patch inserted try { at the top of the function body,
  // but left the original function closing } still in the file,
  // creating: return x; \n } \n\n } catch (err) { 
  // We need to remove that stray } that sits alone before the catch block.

  const lines = src.split('\n');
  const fixed = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextNonEmpty = lines.slice(i + 1).find(l => l.trim() !== '');

    // If this line is just a lone } and the next non-empty line starts with } catch
    if (
      line.trim() === '}' &&
      nextNonEmpty &&
      nextNonEmpty.trim().startsWith('} catch')
    ) {
      // Skip this stray }
      console.log(`  Removed stray } at line ${i + 1} in ${filePath}`);
      i++;
      continue;
    }

    fixed.push(line);
    i++;
  }

  const result = fixed.join('\n');
  if (result !== src) {
    fs.writeFileSync(filePath, result, 'utf8');
    console.log(`[FIXED] ${filePath}`);
  } else {
    console.log(`[NO CHANGE] ${filePath}`);
  }
});
