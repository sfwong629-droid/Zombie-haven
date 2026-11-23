// tools/qa/mood_icons_mock.js — UI chat, 23 Nov (W247): takes the picture of tools/qa/mood_icons_mock.html (mockup only; the game is unchanged).
// Usage: node tools/qa/mood_icons_mock.js  (needs the repo served on :8765)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  for (const [hash, name] of [['', 'mood_icon_samples'], ['#ally', 'mood_icon_allies_samples']]) {
    await p.goto('http://localhost:8765/tools/qa/mood_icons_mock.html' + hash); await p.reload(); await p.waitForTimeout(800);
    const out = require('path').join(__dirname, `../../runs/ui_samples/${name}.png`); await p.screenshot({ path: out, fullPage: true }); console.log('shot', out); } await b.close(); })();
