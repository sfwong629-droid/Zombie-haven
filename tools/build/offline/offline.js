/* Zombie Haven, offline copy (W275): registers the saver (sw.js) and shows a small chip while the game's files are
   being saved on the phone, then "Offline ready". Only in the offline copy (tools/build/offline.py), never in the artifact. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  const chip = document.createElement('div');
  chip.id = 'zhOffline';
  chip.style.cssText = 'position:fixed;z-index:99;left:50%;transform:translateX(-50%);bottom:calc(74px + env(safe-area-inset-bottom));'
    + 'background:#1b2530ee;color:#eef5fa;border:1px solid #ffffff40;border-radius:16px;padding:6px 12px;font:600 14px Manrope,Nunito,-apple-system,sans-serif;'
    + 'letter-spacing:0;display:none;pointer-events:none;text-align:center;max-width:90%;line-height:18px';
  const show = (t, ms) => { chip.textContent = t; chip.style.display = 'block'; clearTimeout(chip._t); if (ms) chip._t = setTimeout(() => { chip.style.display = 'none'; }, ms); };
  const home = () => navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  window.ZH_OFFLINE = { state: 'starting' };
  navigator.serviceWorker.addEventListener('message', (e) => {
    const m = e.data || {};
    if (!m.zhOffline) return;
    window.ZH_OFFLINE = { state: m.zhOffline, build: m.build, done: m.done, total: m.total, why: m.why };
    if (m.zhOffline === 'saving') show('Saving the game for offline · ' + Math.floor(100 * m.done / m.total) + '%');
    else if (m.zhOffline === 'failed') show('Offline save stopped (' + (navigator.onLine ? 'try again' : 'no signal') + '). It carries on next time.', 8000);
    else if (m.zhOffline === 'ready') {
      let first = false; try { first = localStorage.getItem('zhOfflineBuild') !== m.build; localStorage.setItem('zhOfflineBuild', m.build); } catch (err) {}
      if (first) show(home() ? '✓ Offline ready · ' + m.build : '✓ Offline ready · Share → Add to Home Screen', 7000);
    }
  });
  addEventListener('load', () => {
    document.body.appendChild(chip);
    navigator.serviceWorker.register('sw.js').then((reg) => {
      if (reg.active && navigator.serviceWorker.controller) reg.active.postMessage('zhOfflineStatus');
      else show('Saving the game for offline…');
    }).catch((err) => { window.ZH_OFFLINE = { state: 'failed', why: String(err) }; });
  });
})();
