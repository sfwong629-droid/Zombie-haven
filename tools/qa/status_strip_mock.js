// tools/qa/status_strip_mock.js — UI chat, 26 Nov (W249; owner: "For the time bar, I mean like how a phone has a black strip all the way up top
// with time signal and battery. Make something similar to that but make it so that the player will not be confused that it is real time.")
// Mockups on the real town screen, for the picture only. A black strip across the very top like a phone's status bar, in the game's own words:
//   left: the sun (or moon) and "Day 1 · 08:00" (the day always in front of the time, so it never reads as the phone's clock);
//   right: Moth FM's signal (radio bars, lit while he is on air) and a "daylight" bar in place of a battery: a sun and how long until dark.
// A: the strip on its own (a phone in a browser). B: on an iPhone's Home Screen copy, where iOS draws its own time and battery at the very top:
// the game's strip sits under the phone's row, so the two never share a line. C: like B, the day in a chip and "Dark in 10 h" in words.
// The clock capsule under the bar goes; Renown moves up beside the mission. Pictures: runs/ui_samples/strip_<A|B|C>.png, strip_sheet.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const SUN = '<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="5" fill="#ffcf5a"/><g stroke="#ffcf5a" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></g></svg>';
const RADIO = (lit) => `<svg viewBox="0 0 26 16" width="24" height="15"><g fill="${lit}">${[0, 1, 2, 3].map((i) => `<rect x="${i * 6 + 2}" y="${12 - i * 3.5}" width="4" height="${4 + i * 3.5}" rx="1"/>`).join('')}</g></svg>`;
const css = `
.stStrip{position:fixed;left:0;right:0;top:var(--stTop,0px);height:26px;background:#0b0b0d;z-index:60;display:flex;align-items:center;padding:0 14px;gap:8px;font:800 13px Manrope,system-ui,sans-serif;color:#f3ead8;letter-spacing:.2px}
.stStrip .day{display:flex;align-items:center;gap:5px}.stStrip .day b{color:#ffcf5a}.stStrip .sp{flex:1}
.stStrip .fm{display:flex;align-items:center;gap:4px;font:700 10px Manrope,system-ui,sans-serif;color:#b9b2a3}
.stStrip .dl{display:flex;align-items:center;gap:4px;font:700 11px Manrope,system-ui,sans-serif;color:#f3ead8}
.stStrip .dl i{position:relative;width:30px;height:13px;border:1.5px solid #ffcf5a;border-radius:7px;overflow:hidden}.stStrip .dl i::after{content:'';position:absolute;left:1px;top:1px;bottom:1px;width:var(--dl,70%);border-radius:5px;background:linear-gradient(90deg,#ffb23e,#ffd46e)}
.stStrip .chip{background:#2a241d;border:1px solid #4a3f31;border-radius:9px;padding:1px 7px;font:800 11px Manrope,system-ui,sans-serif;color:#ffcf5a}
.iosRow{position:fixed;left:0;right:0;top:0;height:47px;background:#000;z-index:61;display:flex;align-items:flex-end;justify-content:space-between;padding:0 28px 12px 34px;font:600 16px -apple-system,system-ui,sans-serif;color:#fff}
.iosRow .isl{position:absolute;left:50%;top:11px;width:120px;height:34px;margin-left:-60px;border-radius:18px;background:#111}
.iosRow .r{display:flex;gap:6px;align-items:center}.iosRow .bat{width:24px;height:12px;border:1.5px solid #fff;border-radius:4px;position:relative}.iosRow .bat::after{content:'';position:absolute;inset:1.5px;right:5px;background:#fff;border-radius:2px}
.iosLbl{position:fixed;right:6px;top:2px;z-index:62;font:700 9px system-ui;color:#ff8f7a}
html.glass.phone.stMock #quest b#clock{display:none!important}
html.glass.phone.stMock #app{padding-top:0}
`;
(async () => { const b = await Q.launch();
  const p = await Q.page(b, { w: 390, h: 844, look: '' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500);
  for (let i = 0; i < 8; i++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(200); }
  await p.screenshot({ path: path.join(out, 'strip_now.png') });
  for (const k of ['A', 'B', 'C']) {
    await p.evaluate(([css, k, SUN, R1, R2]) => {
      document.querySelectorAll('.stStrip,.iosRow,.iosLbl,#stCss').forEach((e) => e.remove());
      const s = document.createElement('style'); s.id = 'stCss'; s.textContent = css; document.head.appendChild(s); document.documentElement.classList.add('stMock');
      const top = k === 'A' ? 0 : 47, H = top + 26;
      if (k !== 'A') { const r = document.createElement('div'); r.className = 'iosRow'; r.innerHTML = '<span>9:41</span><i class="isl"></i><span class="r">▂▄▆ <i class="bat"></i></span>'; document.body.appendChild(r);
        const l = document.createElement('div'); l.className = 'iosLbl'; l.textContent = "the phone's own row"; document.body.appendChild(l); }
      const st = document.createElement('div'); st.className = 'stStrip'; st.style.setProperty('--stTop', top + 'px');
      const ck = document.getElementById('clock'), m = (ck.textContent || '').match(/DAY\s*(\d+)\s*·\s*(\d+:\d+)/i), day = m ? m[1] : 1, tm = m ? m[2] : '08:00';
      st.innerHTML = k === 'C'
        ? `<span class="day">${SUN}<span class="chip">Day ${day}</span> ${tm}</span><span class="sp"></span><span class="fm">${R1}Moth FM</span><span class="dl">☀ Dark in 10 h</span>`
        : `<span class="day">${SUN}<b>Day ${day}</b> · ${tm}</span><span class="sp"></span><span class="fm">${R2}FM</span><span class="dl"><i style="--dl:78%"></i></span>`;
      document.body.appendChild(st);
      /* move the whole HUD down under the strip */
      const app = document.getElementById('app'); if (app) app.style.top = H + 'px'; document.querySelectorAll('.toast,#toast,.lvlToast').forEach((e) => e.remove());
    }, [css, k, SUN, RADIO('#8fd18b'), RADIO('#8fd18b')]);
    await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, `strip_${k}.png`) });
    await p.evaluate(() => { const app = document.getElementById('app'); if (app) app.style.top = ''; document.querySelectorAll('#plaque,#quest,#gauge,#hudR,#topRight').forEach((e) => { if (e) e.style.marginTop = ''; }); });
  }
  await b.close(); })();
