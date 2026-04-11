const fs = require('fs');

// ─────────────────────────────────────────────
// HELPER: wrap the outermost async function body
// with a step-aware try/catch
// ─────────────────────────────────────────────
function wrapEngine(filePath, funcName, stepName) {
  let src = fs.readFileSync(filePath, 'utf8');

  // Find the opening brace of the exported async function
  const funcRegex = new RegExp(
    `(async function ${funcName}\\([^)]*\\)\\s*\\{)`
  );

  if (!funcRegex.test(src)) {
    console.log(`[SKIP] ${filePath}: could not find function ${funcName}`);
    return;
  }

  // Already patched? Don't double-wrap.
  if (src.includes(`step: '${stepName}'`)) {
    console.log(`[SKIP] ${filePath}: already patched with ${stepName}`);
    return;
  }

  // Insert try { after the function opening brace
  src = src.replace(funcRegex, `$1\n  try {`);

  // Find module.exports line and insert catch block before it
  src = src.replace(
    /^(module\.exports\s*=\s*\{[^}]+\};\s*)$/m,
    `  } catch (err) {\n    throw {\n      step: '${stepName}',\n      message: err.message || String(err),\n      details: {\n        code: err.code || null,\n        status: (err.response && err.response.status) || null,\n      },\n    };\n  }\n}\n\n$1`
  );

  fs.writeFileSync(filePath, src, 'utf8');
  console.log(`[DONE] ${filePath} patched with step: ${stepName}`);
}

// ─────────────────────────────────────────────
// Patch each engine
// ─────────────────────────────────────────────
wrapEngine('engines/scriptEngine.js', 'generateScript', 'SCRIPT_ENGINE');
wrapEngine('engines/pexelsEngine.js', 'fetchVideosForSegments', 'PEXELS_ENGINE');
wrapEngine('engines/voiceEngine.js', 'generateVoice', 'VOICE_ENGINE');
wrapEngine('engines/videoEngine.js', 'buildVideo', 'VIDEO_ENGINE');
wrapEngine('engines/uploadEngine.js', 'uploadToYouTube', 'UPLOAD_ENGINE');

console.log('\nAll engines patched successfully.');
