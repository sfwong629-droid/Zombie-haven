// tools/chatgpt/helpers.js — paste into the browser console (or run with a browser tool) on a chatgpt.com chat tab.
// Rewritten 14 Nov 2026 from what the session used for the armour sheets (the originals lived only in the page and were lost);
// ChatGPT's page changes often, so check the selectors if something stops working.
//   await ZHsend('prompt text')        types the prompt and presses send
//   await ZHwaitImage(180)             waits (seconds) for a new generated image in the last reply, returns its <img>
//   await ZHgrab()                     the newest generated image as a full-size PNG data URL (grab it at once: the page unloads old images)
//   ZHstore[key] = await ZHgrab()      keep several; copy(JSON.stringify(ZHstore)) puts them on the clipboard for tools/art/sheets/dataurls.py
window.ZHstore = window.ZHstore || {};
window.ZHimgs = () => [...document.querySelectorAll('[data-message-author-role="assistant"] img, article img')].filter((i) => i.naturalWidth >= 512);
window.ZHsend = async (text) => {
  const box = document.querySelector('#prompt-textarea, div[contenteditable="true"]'); if (!box) throw new Error('no prompt box');
  box.focus(); document.execCommand('selectAll', false, null); document.execCommand('insertText', false, text);
  await new Promise((r) => setTimeout(r, 400));
  const btn = document.querySelector('[data-testid="send-button"], button[aria-label*="Send"]'); if (!btn) throw new Error('no send button'); btn.click(); return 'sent';
};
window.ZHwaitImage = async (sec = 180) => {
  const before = new Set(ZHimgs().map((i) => i.src)); const t0 = Date.now();
  while (Date.now() - t0 < sec * 1000) { await new Promise((r) => setTimeout(r, 2000)); const n = ZHimgs().filter((i) => !before.has(i.src) && i.complete); if (n.length) return n[n.length - 1]; }
  throw new Error('no new image after ' + sec + ' s');
};
window.ZHgrab = async (img) => {
  img = img || ZHimgs().slice(-1)[0]; if (!img) throw new Error('no image');
  const blob = await (await fetch(img.currentSrc || img.src)).blob();
  return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
};
