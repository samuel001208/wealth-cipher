const fs = require('fs');

let src = fs.readFileSync('index.js', 'utf8');

// 1. Add normalizeError helper before runPipeline
const helperFn = `
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

`;

// Insert helper before async function runPipeline
src = src.replace(
  /^(async function runPipeline\(\))/m,
  helperFn + '$1'
);

// 2. Replace the old catch block body with step-aware version
// Old: } catch (err) { console.error ... sendFailure({ engine: ...})
// New: } catch (err) { const n = normalizeError(err); ... sendFailure({ step: n.step, ...})
src = src.replace(
  /\} catch \(err\) \{[\s\S]*?await sendFailure\(\{[\s\S]*?\}\);/,
  `} catch (err) {
    const normalized = normalizeError(err);
    console.error('\\nPipeline failed at step:', normalized.step);
    console.error('Error:', normalized.message);
    logEntry.status = 'failed';
    logEntry.error = normalized.message;
    addLogEntry(logEntry);
    await sendFailure({
      step: normalized.step,
      message: normalized.message,
      details: normalized.details,
    });`
);

fs.writeFileSync('index.js', src, 'utf8');
console.log('[DONE] index.js patched with normalizeError and step-aware catch.');
