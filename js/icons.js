/* Zombie Haven 3D.27 — "Bunker Comic · Misprint" UI icons (picked 2026-11-05, replaces the Clay set).
   Look: cheap comic-book print. Flat colour is printed slightly off the black ink line (misregistered), with
   Ben-Day dot shading on the lower right and white paper gleams. Every icon is hand-written SVG (offline).
   Source format: one self-closing element per shape.
     fill="X"         colour shape: colour layer (offset) + dot shading + ink outline
     fill="K"         solid ink (eyes, knobs): ink layer only
     class="l"        ink line only (optional sw="2" width, st="R" colour)
     class="h"        white paper gleam on top
   ZHIcons.svg(name, px) -> inline SVG for the DOM; ZHIcons.img(name) -> Image for canvas; ZHIcons.EMOJI maps emoji -> icon. */
(function () {
  const INK = '#161616';
  const PAL = { K: INK, W: '#FFFDF4', P: '#F6ECD2', R: '#E0482F', Y: '#F2B533', B: '#1F3F66', C: '#3DA5D9', G: '#6BB35A', N: '#B9783E', T: '#F0C98A',
    S: '#A9B0B3', D: '#8F897E', O: '#E8853A', V: '#8A6BD1', F: '#F2C29A', Z: '#9DBB6A', L: '#C7DE8E', I: '#BFE3F2', M: '#C4643F', Q: '#F59BB0' };
  const FACE = '<circle fill="Y" cx="16" cy="16" r="12"/>';
  const P = {
    /* ---- resources ---- */
    water: `<path fill="C" d="M16 3.5C12 10.5 7 15.5 7 21a9 9 0 0 0 18 0c0-5.5-5-10.5-9-17.5z"/><path class="h" d="M11.5 20.5a4.6 4.6 0 0 0 2.8 4.4"/>`,
    food: `<path fill="O" d="M19 5.5c5 0 8.3 3.6 7.9 8.4-.4 4.7-4.5 8.1-9.2 8.3l-3.3.2-4 4.2a2.4 2.4 0 1 1-3.4-3.3l.2-.2a2.4 2.4 0 1 1 3-3.6l4.1-4c-.4-6 .7-10 4.7-10z"/><path class="h" d="M19.5 10c2 0 3.5 1.5 3.4 3.4"/>`,
    parts: `<path fill="S" d="M16 3.5l2.4 3 3.8-.7.7 3.8 3 2.4-1.8 3.3 1.8 3.3-3 2.4-.7 3.8-3.8-.7-2.4 3-2.4-3-3.8.7-.7-3.8-3-2.4L7.9 16l-1.8-3.3 3-2.4.7-3.8 3.8.7z"/><circle fill="P" cx="16" cy="16" r="3.8"/>`,
    wood: `<rect fill="N" x="3.5" y="14" width="21" height="9.5" rx="4.7"/><rect fill="N" x="8" y="5.5" width="20" height="9.5" rx="4.7"/><ellipse fill="T" cx="23" cy="10.2" rx="3.8" ry="4"/><ellipse fill="T" cx="20" cy="18.7" rx="3.8" ry="4"/><path class="l" sw="1.6" d="M23 10.2h.01M20 18.7h.01M7 19h7M11.5 10h6"/>`,
    stone: `<path fill="D" d="M4.5 22l3-9 7.5-4.5 8.5 2 4.5 7.5-3 6.5-10.5 2z"/><path class="l" sw="1.8" d="M15 8.5l-2 7.5 7.5 3M13 16l-6.5 3"/><path class="h" d="M9.5 14.5l3-2"/>`,
    cloth: `<rect fill="T" x="7.5" y="3.5" width="17" height="4.5" rx="1.6"/><rect fill="R" x="10" y="8" width="12" height="16"/><rect fill="T" x="7.5" y="24" width="17" height="4.5" rx="1.6"/><path class="l" sw="1.5" d="M10 12.5l12-2.5M10 17l12-2.5M10 21.5l12-2.5"/><path class="l" sw="1.8" d="M22 18c3 0 5 2 5 5"/>`,
    meds: `<rect fill="W" x="5" y="5" width="22" height="22" rx="5"/><path fill="R" d="M13.3 9h5.4v4.3H23v5.4h-4.3V23h-5.4v-4.3H9v-5.4h4.3z"/>`,
    fuel: `<path fill="R" d="M7.5 9h12l5.5 5.5V28H7.5z"/><rect fill="S" x="20" y="3.5" width="5" height="4.5" rx="1"/><path class="l" sw="2" d="M11 9V5.5h6.5V9M11.5 15l9 9M20.5 15l-9 9"/>`,
    stash: `<path fill="G" d="M7.5 12.5a8.5 8.5 0 0 1 17 0V26a2.5 2.5 0 0 1-2.5 2.5H10A2.5 2.5 0 0 1 7.5 26z"/><rect fill="Y" x="11" y="17" width="10" height="7.5" rx="1.6"/><path class="l" d="M12.8 7.5a3.2 3.2 0 0 1 6.4 0"/><path class="l" sw="1.8" d="M11 20h10"/>`,
    power: `<path fill="Y" d="M18.5 2.5L6.5 18h7.5l-2.5 11.5L25.5 13H18z"/><path class="h" d="M16 6l-4.5 6.5"/>`,
    /* ---- menu / HUD ---- */
    build: `<path fill="N" d="M17 13L6.5 23.8a2.4 2.4 0 0 0 3.4 3.4L20.5 16.5"/><path fill="S" d="M13.5 7.2l4.4-3.5 9.4 9.4-3.5 4.4-2.8-2.8-2.7 2.7-4-4 2.7-2.7z"/>`,
    explore: `<circle fill="W" cx="16" cy="16" r="12"/><path fill="R" d="M16 6.5l3.2 9.5H12.8z"/><path fill="S" d="M12.8 16h6.4L16 25.5z"/><circle fill="K" cx="16" cy="16" r="1.4"/>`,
    people: `<circle fill="F" cx="11.5" cy="10.5" r="4.4"/><circle fill="F" cx="22" cy="12" r="3.8"/><path fill="G" d="M17 20c1.3-.9 3-1.4 4.8-1.4 3.8 0 6.7 2.8 6.7 7.4h-9.5"/><path fill="B" d="M3.5 26.5c0-5.3 3.6-8.5 8-8.5s8 3.2 8 8.5z"/>`,
    town: `<path fill="T" d="M7 14.5L16 7l9 7.5V27H7z"/><path fill="R" d="M3.5 16L16 5.5 28.5 16l-2.2 2.4L16 9.6 5.7 18.4z"/><rect fill="N" x="13" y="18.5" width="6" height="8.5" rx="1"/>`,
    guide: `<path fill="W" d="M16 8c-3-2-7.5-2.6-11.5-2v19.5c4-.6 8.5 0 11.5 2 3-2 7.5-2.6 11.5-2V6c-4-.6-8.5 0-11.5 2z"/><path class="l" d="M16 8v19.5"/><path class="l" sw="1.6" d="M8 11h5M8 15h5M8 19h4M19 11h5M19 15h5M19 19h4"/>`,
    home: `<path fill="W" d="M6.5 15L16 7.5l9.5 7.5v12h-19z"/><path fill="R" d="M3.5 16L16 5.5 28.5 16l-2.2 2.4L16 9.6 5.7 18.4z"/><rect fill="C" x="13" y="18.5" width="6" height="8.5" rx="1"/>`,
    save: `<rect fill="B" x="5" y="5" width="22" height="22" rx="3"/><rect fill="W" x="10" y="5" width="12" height="7.5"/><rect fill="W" x="9" y="17" width="14" height="10" rx="1"/><path class="l" sw="1.6" d="M12 21h8M12 24h6"/>`,
    sound: `<path fill="Y" d="M4.5 12h5.5l7.5-6.5v21L10 20H4.5z"/><path class="l" d="M21.5 11c2 1.8 2 8.2 0 10M25 7.5c4.2 3.6 4.2 13.4 0 17"/>`,
    soundLow: `<path fill="Y" d="M4.5 12h5.5l7.5-6.5v21L10 20H4.5z"/><path class="l" d="M21.5 11c2 1.8 2 8.2 0 10"/>`,
    soundOff: `<path fill="S" d="M4.5 12h5.5l7.5-6.5v21L10 20H4.5z"/><path class="l" sw="3" st="R" d="M21 12l7 8M28 12l-7 8"/>`,
    log: `<path fill="T" d="M9 5h15a3 3 0 0 1 0 6H9z"/><path fill="W" d="M9 5v20a3 3 0 0 0 6 0V11h9v14a3 3 0 0 1-3 3h-9"/><path class="l" sw="1.6" d="M17.5 16h4.5M17.5 20h3.5"/>`,
    locate: `<circle fill="W" cx="16" cy="16" r="9"/><circle fill="R" cx="16" cy="16" r="3.6"/><path class="l" d="M16 3v5M16 24v5M3 16h5M24 16h5"/>`,
    speed: `<path fill="Y" d="M4 7l11 9-11 9z"/><path fill="Y" d="M16 7l11 9-11 9z"/>`,
    pause: `<rect fill="B" x="7" y="6" width="6.5" height="20" rx="1.5"/><rect fill="B" x="18.5" y="6" width="6.5" height="20" rx="1.5"/>`,
    chat: `<path fill="W" d="M5 6.5h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H14l-6 5v-5H5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2z"/><circle fill="K" cx="10.5" cy="14.5" r="1.8"/><circle fill="K" cx="16" cy="14.5" r="1.8"/><circle fill="K" cx="21.5" cy="14.5" r="1.8"/>`,
    clock: `<circle fill="W" cx="16" cy="16" r="12"/><path class="l" d="M16 9v7l4.5 3"/><path class="l" sw="2" d="M16 5.5v1.5M26.5 16H25M16 26.5V25M5.5 16H7"/>`,
    map: `<path fill="T" d="M3.5 8l8.5-3 8 3 8.5-3v19.5l-8.5 3-8-3-8.5 3z"/><path class="l" sw="1.6" d="M12 5v19.5M20 8v19.5"/><path class="l" sw="2" st="R" d="M7 20c3-6 6.5 2 9.5-4s4.5-4 8-6"/>`,
    search: `<circle fill="I" cx="13.5" cy="13.5" r="8"/><path class="l" sw="4.2" d="M19.5 19.5l7 7"/><path class="h" d="M9.5 11a4.2 4.2 0 0 1 3.2-2.7"/>`,
    cross: `<circle fill="R" cx="16" cy="16" r="12"/><path class="h" sw="3.4" d="M11.5 11.5l9 9M20.5 11.5l-9 9"/>`,
    check: `<circle fill="G" cx="16" cy="16" r="12"/><path class="h" sw="3.4" d="M10.5 16.5l3.8 3.8 7.2-8"/>`,
    upgrade: `<path fill="G" d="M16 3L27.5 14.5H21V28H11V14.5H4.5z"/><path class="h" d="M14 9.5L10 13.5"/>`,
    lock: `<path class="l" sw="3.2" d="M10.5 14v-3.5a5.5 5.5 0 0 1 11 0V14"/><rect fill="Y" x="6.5" y="14" width="19" height="13.5" rx="2.5"/><circle fill="K" cx="16" cy="20.5" r="2.2"/>`,
    unlock: `<path class="l" sw="3.2" d="M10.5 14V9.5a5.5 5.5 0 0 1 11 0"/><rect fill="G" x="6.5" y="14" width="19" height="13.5" rx="2.5"/><circle fill="K" cx="16" cy="20.5" r="2.2"/>`,
    /* ---- status / alerts ---- */
    heart: `<path fill="R" d="M16 27.5S4.5 20.8 4.5 12.6A6 6 0 0 1 16 9.8a6 6 0 0 1 11.5 2.8C27.5 20.8 16 27.5 16 27.5z"/><path class="h" d="M9.5 12.5a3 3 0 0 1 2.7-2.7"/>`,
    star: `<path fill="Y" d="M16 3.5l3.7 7.6 8.3 1.2-6 5.9 1.4 8.3L16 22.6l-7.4 3.9L10 18.2l-6-5.9 8.3-1.2z"/><path class="h" d="M13.3 12.3l1.4-2.8"/>`,
    renown: `<path fill="B" d="M8.5 3h6.5l3 9.5h-6.5z"/><path fill="R" d="M23.5 3H17l-3 9.5h6.5z"/><circle fill="Y" cx="16" cy="20.5" r="8"/><path class="l" sw="1.6" d="M16 16l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z"/>`,
    trophy: `<path fill="Y" d="M10 4.5h12v6.5a6 6 0 0 1-12 0z"/><path class="l" d="M10 7H6a4 4 0 0 0 4 5.5M22 7h4a4 4 0 0 1-4 5.5"/><path fill="N" d="M13 22h6l1.5 5.5h-9z"/><path class="l" d="M16 17v5"/>`,
    warn: `<path fill="Y" d="M16 3.5l13 23H3z"/><path class="l" sw="3.2" d="M16 11.5v7.5"/><circle fill="K" cx="16" cy="23" r="1.9"/>`,
    bang: `<path fill="Y" d="M16 1.5l3.2 7.3 7.4-3-2.2 7.5 6.9 3.1-6.9 3.1 2.2 7.5-7.4-3-3.2 7.3-3.2-7.3-7.4 3 2.2-7.5L.7 16.4l6.9-3.1-2.2-7.5 7.4 3z"/><path class="l" sw="3.2" d="M16 9.5v8"/><circle fill="K" cx="16" cy="22" r="1.9"/>`,
    question: `<circle fill="C" cx="16" cy="16" r="12"/><path class="h" sw="3.2" d="M12.4 12.4a3.6 3.6 0 1 1 5.2 3.3c-1.2.6-1.6 1.4-1.6 2.9"/><circle fill="W" cx="16" cy="23" r="1.9"/>`,
    fire: `<path fill="R" d="M16 2.5c1.6 5.2 7.8 7.8 7.8 15a7.8 7.8 0 0 1-15.6 0c0-3.6 1.9-5.7 3.3-7.2.3 2.7 1.5 4.1 2.7 4.5C13.5 10.5 14.1 6 16 2.5z"/><path fill="Y" d="M16 15c1.6 2.1 3.4 3.1 3.4 5.8a3.4 3.4 0 0 1-6.8 0c0-1.9 1.7-3.3 3.4-5.8z"/>`,
    skull: `<path fill="W" d="M16 3.5C9.3 3.5 5 8.2 5 14c0 3.7 1.9 5.8 3.6 6.8v4.7h14.8v-4.7c1.7-1 3.6-3.1 3.6-6.8 0-5.8-4.3-10.5-11-10.5z"/><circle fill="K" cx="11.6" cy="14.6" r="3"/><circle fill="K" cx="20.4" cy="14.6" r="3"/><path class="l" sw="1.8" d="M13 25.5v-3M16 25.5v-3M19 25.5v-3"/>`,
    zombie: `<circle fill="Z" cx="16" cy="15.5" r="11"/><circle fill="W" cx="11.6" cy="13.5" r="3"/><circle fill="W" cx="20.6" cy="14" r="2.4"/><circle fill="K" cx="12" cy="14" r="1.2"/><circle fill="K" cx="20.4" cy="14.4" r="1"/><path class="l" sw="2" d="M10.5 21h11M13 19.5v3M16 19.5v3M19 19.5v3"/>`,
    blood: `<path fill="R" d="M16 3.5C12 10.5 7 15.5 7 21a9 9 0 0 0 18 0c0-5.5-5-10.5-9-17.5z"/><path class="h" d="M11.5 20.5a4.6 4.6 0 0 0 2.8 4.4"/>`,
    alarm: `<path fill="R" d="M4.5 13h5l13-7v20l-13-7h-5z"/><rect fill="S" x="8" y="19" width="5" height="8" rx="1.5"/><path class="l" d="M26 12.5v7"/>`,
    shield: `<path fill="B" d="M16 3.5l10.5 3.8v7.8c0 6.7-4.7 10.9-10.5 13.4C10.2 26 5.5 21.8 5.5 15.1V7.3z"/><path class="h" d="M16 8v16"/>`,
    fight: `<path fill="S" d="M5 4.5l3.5-.5 13 13-3 3-13-13z"/><path fill="S" d="M27 4.5L23.5 4l-13 13 3 3 13-13z"/><path fill="N" d="M8 23l3-3 2.5 2.5-3 3z"/><path fill="N" d="M24 23l-3-3-2.5 2.5 3 3z"/><path class="l" sw="2.4" d="M15.5 26l-9-9M16.5 26l9-9"/>`,
    flag: `<path class="l" sw="3" d="M8 3.5v25"/><path fill="B" d="M8.5 5.5h16l-3.8 5.2 3.8 5.3h-16z"/><circle fill="W" cx="14.5" cy="10.8" r="2"/>`,
    /* ---- time / weather ---- */
    sun: `<circle fill="Y" cx="16" cy="16" r="6.5"/><path class="l" sw="2.6" d="M16 3v3.5M16 25.5V29M3 16h3.5M25.5 16H29M6.8 6.8l2.5 2.5M22.7 22.7l2.5 2.5M6.8 25.2l2.5-2.5M22.7 9.3l2.5-2.5"/>`,
    moon: `<path fill="Y" d="M21 4.5a11.5 11.5 0 1 0 6.5 18.8A9.5 9.5 0 0 1 21 4.5z"/><path class="h" d="M9 13a7 7 0 0 1 3.5-4.5"/>`,
    cloud: `<path fill="W" d="M9 25a6 6 0 0 1-.6-12 8 8 0 0 1 15.4 1.6A5.3 5.3 0 0 1 23.5 25z"/>`,
    rain: `<path fill="S" d="M9 19a6 6 0 0 1-.6-12 8 8 0 0 1 15.4 1.6A5.3 5.3 0 0 1 23.5 19z"/><path class="l" sw="2.6" st="C" d="M10 22.5l-1.5 4M16 22.5l-1.5 4M22 22.5l-1.5 4"/>`,
    storm: `<path fill="D" d="M9 18a6 6 0 0 1-.6-12 8 8 0 0 1 15.4 1.6A5.3 5.3 0 0 1 23.5 18z"/><path fill="Y" d="M16.5 15.5l-5 7h4l-1.5 6.5 6.5-8.5h-4l2-5z"/>`,
    snow: `<path class="l" sw="2.6" d="M16 3.5v25M5.2 9.8l21.6 12.4M5.2 22.2l21.6-12.4"/><circle fill="C" cx="16" cy="16" r="3.5"/><path class="l" sw="2" d="M12.5 5.5L16 8l3.5-2.5M12.5 26.5L16 24l3.5 2.5"/>`,
    sleep: `<path fill="B" d="M4.5 6h9.5v3.2L9 14.4h5V17.6H4.5v-3.2L9.5 9.2h-5z"/><path fill="B" d="M17 13h10v3.2l-5.2 5.6H27V25H17v-3.2l5.2-5.6H17z"/>`,
    candle: `<rect fill="W" x="12" y="13.5" width="8" height="14" rx="1.5"/><path fill="Y" d="M16 3.5c2.1 3.1 3.1 4.7 3.1 6.4a3.1 3.1 0 0 1-6.2 0c0-1.7 1-3.3 3.1-6.4z"/>`,
    /* ---- tools & things ---- */
    wrench: `<path fill="S" d="M20 4.5a6.2 6.2 0 0 0-5.6 8.7L5 22.6a2.6 2.6 0 0 0 3.7 3.7l9.4-9.4a6.2 6.2 0 0 0 8.9-6.6l-3.7 3.7-3.5-.9-.9-3.5 3.7-3.7a6.2 6.2 0 0 0-2.6-.4z"/>`,
    axe: `<rect fill="N" x="14.6" y="4" width="3.4" height="25" rx="1.5" transform="rotate(30 16 16)"/><path fill="S" d="M16.3 5.5c4-2.4 9.3-.6 11.4 3l-3.4 6.2c-3-1.4-6-1.3-8 .2z" transform="rotate(30 16 16)"/>`,
    pick: `<rect fill="N" x="14.4" y="7" width="3.4" height="22" rx="1.5" transform="rotate(20 16 16)"/><path fill="S" d="M3.5 11.5c6-6.6 19-6.6 25 0-6.5-2.6-18.5-2.6-25 0z" transform="rotate(20 16 16)"/>`,
    crowbar: `<path fill="R" d="M7.5 27L21.5 6c1.6-2.2 4.8-2.2 5.9.2l-2.6 1.5c-.6-.9-1.6-.9-2.2 0L10.8 29.2z"/>`,
    toolbox: `<path class="l" sw="2.8" d="M12 11V7.5h8V11"/><rect fill="R" x="4" y="11" width="24" height="15.5" rx="2"/><path class="l" sw="2" d="M4 17h24"/><rect fill="S" x="13.5" y="15" width="5" height="4" rx="1"/>`,
    box: `<path fill="N" d="M4.5 10.5L16 5.5l11.5 5v12.5L16 28 4.5 23z"/><path class="l" sw="2" d="M4.5 10.5L16 15.5l11.5-5M16 15.5V28"/><path class="h" d="M8 13.2l5 2.2"/>`,
    gift: `<rect fill="R" x="5" y="12" width="22" height="15" rx="1.5"/><rect fill="R" x="3.5" y="8.5" width="25" height="5" rx="1.2"/><rect fill="Y" x="13.5" y="8.5" width="5" height="18.5"/><path class="l" sw="2.2" d="M16 8.5c-2-4-7-5-7-2s4 2 7 2c3 0 7 1 7-2s-5-2-7 2"/>`,
    party: `<path fill="Y" d="M4 28l6.5-17 10.5 10.5z"/><path class="l" sw="1.6" d="M8 18l5 5M9.5 14l7.5 7.5"/><rect fill="R" x="18" y="4" width="3" height="3" transform="rotate(20 19.5 5.5)"/><rect fill="C" x="25" y="9" width="3" height="3" transform="rotate(-25 26.5 10.5)"/><rect fill="G" x="22" y="15.5" width="3" height="3" transform="rotate(35 23.5 17)"/><path class="l" sw="2" d="M14.5 8c1-2 3-3 4.5-2.5M21 12c2-1 4.5-.5 5.5 1"/>`,
    research: `<path fill="W" d="M14 4v8L7.5 23.5A2.6 2.6 0 0 0 9.8 27h12.4a2.6 2.6 0 0 0 2.3-3.5L18 12V4z"/><path fill="V" d="M10.2 20h11.6l2.3 3.8c.4 1-.3 1.7-1.3 1.7H9.2c-1 0-1.7-.7-1.3-1.7z"/><path class="l" d="M11.5 4h9"/><path class="h" d="M12 14.5l-2.5 4.5"/>`,
    radio: `<path class="l" sw="2.6" d="M9 11.5L22.5 4.5"/><rect fill="N" x="4" y="11.5" width="24" height="15.5" rx="2.5"/><circle fill="W" cx="11" cy="19.2" r="4.2"/><path class="l" sw="2" d="M18 16.5h6M18 20.5h6M18 24h4"/>`,
    shop: `<path class="l" sw="2.6" d="M3 5h4l3 15"/><path fill="Y" d="M8 8.5h20l-2.5 10H10z"/><circle fill="K" cx="12" cy="25.5" r="2.4"/><circle fill="K" cx="23" cy="25.5" r="2.4"/><path class="l" sw="2.2" d="M10 20.5h15"/>`,
    meal: `<path fill="O" d="M4.5 16.5h23a11.5 9 0 0 1-23 0z"/><path class="l" sw="1.8" d="M12 12.5c0-2.2 2-2.2 2-4.4M17.5 12.5c0-2.2 2-2.2 2-4.4"/><path class="h" d="M8.5 19.5a7 5 0 0 0 4 4"/>`,
    pill: `<rect fill="W" x="4.5" y="10.8" width="23" height="10.4" rx="5.2" transform="rotate(-40 16 16)"/><path fill="R" d="M16 10.8h-6.3a5.2 5.2 0 0 0 0 10.4H16z" transform="rotate(-40 16 16)"/>`,
    medic: `<rect fill="W" x="5" y="5" width="22" height="22" rx="5"/><path fill="R" d="M13.3 9h5.4v4.3H23v5.4h-4.3V23h-5.4v-4.3H9v-5.4h4.3z"/>`,
    bed: `<path class="l" sw="2.8" d="M4 24V9.5M28 24v-7"/><rect fill="B" x="4" y="16.5" width="24" height="5.5"/><rect fill="W" x="6" y="12" width="7.5" height="4.5" rx="2"/>`,
    train: `<rect fill="S" x="3.5" y="11.5" width="4.5" height="9" rx="1.5"/><rect fill="S" x="24" y="11.5" width="4.5" height="9" rx="1.5"/><rect fill="R" x="8" y="9" width="4.5" height="14" rx="1.5"/><rect fill="R" x="19.5" y="9" width="4.5" height="14" rx="1.5"/><path class="l" sw="3" d="M12.5 16h7"/>`,
    door: `<rect fill="N" x="8" y="3.5" width="16" height="25" rx="1.5"/><path class="l" sw="1.8" d="M11.5 7.5h9v8h-9zM11.5 18.5h9v6.5"/><circle fill="K" cx="20.5" cy="17" r="1.5"/>`,
    sprout: `<path fill="N" d="M5.5 23.5h21l-2.2 5H7.7z"/><path class="l" sw="2.6" d="M16 23.5v-11"/><path fill="G" d="M16 14.5c-6.3 0-9.5-3.2-9.5-8.5 6.3 0 9.5 3.2 9.5 8.5z"/><path fill="G" d="M16 12.5c0-5.3 3.2-8.5 9.5-8.5 0 5.3-3.2 8.5-9.5 8.5z"/>`,
    music: `<ellipse fill="B" cx="9.5" cy="23.5" rx="4.2" ry="3.2"/><ellipse fill="B" cx="22.5" cy="20.5" rx="4.2" ry="3.2"/><path fill="B" d="M12.5 23.5V8l14-3.5v16h-2.2V8.3l-9.6 2.3v12.9z"/>`,
    strong: `<path fill="F" d="M4.5 25c1.8-6 4.6-9.3 8-10.5l.6-6.4c.2-2.4 3.4-3.1 4.6-.9l2.2 5.4c4.2 0 7.6 3.1 7.6 7.4 0 4.2-3.9 6.5-8.2 6.5H7.5C5.6 26.5 4.4 26 4.5 25z"/><path class="l" sw="1.8" d="M14 19c2 1.5 4.5 1.5 6.5 0"/>`,
    /* ---- buildings (HQ tiers etc.) ---- */
    tent: `<path fill="G" d="M2.5 27.5L16 5l13.5 22.5z"/><path fill="K" d="M16 13l-5.3 14.5h10.6z"/><path class="l" sw="2" d="M16 5V2.5"/>`,
    lodge: `<rect fill="N" x="5.5" y="15" width="21" height="12.5"/><path fill="R" d="M2.5 16.5L16 6l13.5 10.5-2 2.4L16 10.2 4.5 18.9z"/><rect fill="Y" x="9" y="18.5" width="5" height="4"/><rect fill="K" x="17.5" y="18.5" width="5" height="9"/><path class="l" sw="1.4" d="M5.5 23h3.5"/>`,
    fort: `<path fill="D" d="M4 11h4v-4h4v4h3V7h2v4h3V7h4v4h4v16.5H4z"/><path fill="K" d="M13 27.5v-6a3 3 0 0 1 6 0v6z"/><path class="l" sw="1.5" d="M4 16.5h24M9.5 16.5v5M22.5 16.5v5"/><path class="l" sw="2" d="M16 7V2.5"/><path fill="R" d="M16.5 2.5h5l-1.5 2 1.5 2h-5z"/>`,
    wall: `<rect fill="M" x="4" y="8" width="24" height="18.5" rx="1.5"/><path class="l" sw="1.8" d="M4 14.2h24M4 20.4h24M12 8v6.2M20 14.2v6.2M12 20.4v6.1"/>`,
    worker: `<circle fill="F" cx="16" cy="19.5" r="7"/><path fill="Y" d="M6.3 16a9.7 9.7 0 0 1 19.4 0z"/><path class="l" sw="2.8" d="M4.5 16.3h23"/><path class="l" sw="2" d="M16 6.3v3.2"/>`,
    person: `<circle fill="F" cx="16" cy="10.5" r="5.2"/><path fill="G" d="M6.5 27.5c0-5.8 4.2-9.5 9.5-9.5s9.5 3.7 9.5 9.5z"/>`,
    baby: `<circle fill="F" cx="16" cy="12.5" r="7.2"/><circle fill="K" cx="13.3" cy="12.5" r="1.2"/><circle fill="K" cx="18.7" cy="12.5" r="1.2"/><path fill="Q" d="M7.5 27.5c1-4.2 4.2-6.5 8.5-6.5s7.5 2.3 8.5 6.5z"/>`,
    pet: `<path fill="T" d="M7.5 12.5c-3 0-4.2 4-2.2 6.2l2.2 1v5.8h4.2v-3.2h8.6v3.2h4.2v-8.5l2-2-2-4.3-4.2 2.1H10.8z"/><circle fill="K" cx="8.6" cy="15.2" r="1.1"/><path class="l" sw="2" d="M24.5 12.5l2-4"/>`,
    couple: `<path fill="Q" d="M16 27.5S4.5 20.8 4.5 12.6A6 6 0 0 1 16 9.8a6 6 0 0 1 11.5 2.8C27.5 20.8 16 27.5 16 27.5z"/><path fill="R" d="M16 25s-6.5-4.8-6.5-9.6A3.5 3.5 0 0 1 16 14a3.5 3.5 0 0 1 6.5 1.4C22.5 20.2 16 25 16 25z"/>`,
    sick: `<circle fill="L" cx="16" cy="16" r="12"/><path class="l" sw="2.4" d="M10.5 14.5h3.5M18 14.5h3.5M11.5 21.5c2.8-1.6 6.2-1.6 9 0"/><rect fill="W" x="22" y="2.5" width="4.2" height="11" rx="2.1"/><rect fill="R" x="22.9" y="9" width="2.4" height="3.4"/>`,
    /* ---- moods (comic faces for survivor emotes) ---- */
    happy: FACE + `<circle fill="K" cx="11.8" cy="13.5" r="1.7"/><circle fill="K" cx="20.2" cy="13.5" r="1.7"/><path class="l" sw="2.6" d="M10 18.5c3.4 4 8.6 4 12 0"/><path class="h" d="M8 10.5a9 9 0 0 1 4-4"/>`,
    laugh: FACE + `<path class="l" sw="2.4" d="M9.5 13.5l2.5-2 2.5 2M17.5 13.5l2.5-2 2.5 2"/><path fill="K" d="M9.5 17h13a6.5 6.5 0 0 1-13 0z"/><path fill="R" d="M12.5 21.5a5 3 0 0 1 7 0 6.5 6.5 0 0 1-7 0z"/>`,
    angry: `<circle fill="R" cx="16" cy="16" r="12"/><path class="l" sw="2.6" d="M9 10.5l5 2.5M23 10.5l-5 2.5M11 22c3-2.4 7-2.4 10 0"/><circle fill="K" cx="12.3" cy="15.5" r="1.6"/><circle fill="K" cx="19.7" cy="15.5" r="1.6"/>`,
    scared: `<circle fill="I" cx="16" cy="16" r="12"/><circle fill="W" cx="11.8" cy="13" r="3"/><circle fill="W" cx="20.2" cy="13" r="3"/><circle fill="K" cx="11.8" cy="13.3" r="1.2"/><circle fill="K" cx="20.2" cy="13.3" r="1.2"/><ellipse fill="K" cx="16" cy="21.5" rx="2.6" ry="3.2"/><path fill="C" d="M26 5c-1.6 2.6-2.8 4-2.8 5.4a2.8 2.8 0 0 0 5.6 0c0-1.4-1.2-2.8-2.8-5.4z"/>`,
    sad: FACE + `<circle fill="K" cx="11.8" cy="13.5" r="1.7"/><circle fill="K" cx="20.2" cy="13.5" r="1.7"/><path class="l" sw="2.6" d="M11 22c3-2.6 7-2.6 10 0"/><path fill="C" d="M10.5 17c-1.3 2.2-2.3 3.4-2.3 4.6a2.3 2.3 0 0 0 4.6 0c0-1.2-1-2.4-2.3-4.6z"/>`,
    tired: FACE + `<path class="l" sw="2.4" d="M9.5 14h4.6M17.9 14h4.6M13 21h6"/><path class="l" sw="1.8" st="B" d="M22 3.5h4l-4 4h4"/>`,
    love: FACE + `<path fill="R" d="M11.8 17s-4-2.6-4-5.2a2 2 0 0 1 4-.6 2 2 0 0 1 4 .6c0 2.6-4 5.2-4 5.2z"/><path fill="R" d="M20.2 17s-4-2.6-4-5.2a2 2 0 0 1 4-.6 2 2 0 0 1 4 .6c0 2.6-4 5.2-4 5.2z"/><path class="l" sw="2.4" d="M12 21c2.6 2.4 5.4 2.4 8 0"/>`,
    hurt: FACE + `<path class="l" sw="2.2" d="M9.8 11.5l3.6 3.6M13.4 11.5l-3.6 3.6M18.6 11.5l3.6 3.6M22.2 11.5l-3.6 3.6M11 22l2.5-1.5 2.5 1.5 2.5-1.5 2.5 1.5"/><rect fill="W" x="18" y="2.5" width="10" height="4" rx="1" transform="rotate(30 23 4.5)"/>`,
    cool: FACE + `<path fill="K" d="M6.5 11.5h19v2.5c0 2.6-2 4.3-4.5 4.3s-4.2-1.7-4.5-4.3h-1c-.3 2.6-2 4.3-4.5 4.3S6.5 16.6 6.5 14z"/><path class="l" sw="2.4" d="M12.5 22c2.6 1.2 5.4 1 7.5-.6"/>`,
    yum: FACE + `<path class="l" sw="2.4" d="M9.5 13.5l2.5-2 2.5 2M17.5 13.5l2.5-2 2.5 2M10.5 19c3.2 3 7.8 3 11 0"/><path fill="R" d="M16.5 20.5h4.5v2.5a2.25 2.25 0 0 1-4.5 0z"/>`,
  };
  P.scrap = P.parts; P.hammer = P.build; P.ruin = P.town;
  /* ---- compile one icon into its three print layers ---- */
  const EL = /<(\w+)\s([^>]*?)\/>/g, ATT = /(\w[\w-]*)="([^"]*)"/g;
  function parse(src) { const out = []; let m; EL.lastIndex = 0; while ((m = EL.exec(src))) { const a = {}; let q; ATT.lastIndex = 0; while ((q = ATT.exec(m[2]))) a[q[1]] = q[2]; out.push({ tag: m[1], a }); } return out; }
  const attrs = (a, skip) => Object.keys(a).filter((k) => !skip.includes(k)).map((k) => `${k}="${a[k]}"`).join(' ');
  const SK = ['fill', 'class', 'sw', 'st', 'stroke', 'stroke-width'];
  function layers(name, dotsId, maskId) {
    const els = parse(P[name]); let col = '', dots = '', ink = '';
    for (const { tag, a } of els) {
      const rest = attrs(a, SK), cls = a.class || '';
      if (cls === 'h') { ink += `<${tag} ${rest} fill="none" stroke="${PAL.W}" stroke-width="${a.sw || 2.2}" stroke-linecap="round"/>`; continue; }
      if (cls === 'l') { ink += `<${tag} ${rest} fill="none" stroke="${PAL[a.st] || INK}" stroke-width="${a.sw || 2.8}"/>`; continue; }
      if (a.fill === 'K') { ink += `<${tag} ${rest} fill="${INK}" stroke="${INK}" stroke-width="1"/>`; continue; }
      const c = PAL[a.fill] || a.fill || PAL.W;
      col += `<${tag} ${rest} fill="${c}"/>`; dots += `<${tag} ${rest} fill="url(#${dotsId})"/>`; ink += `<${tag} ${rest} fill="none" stroke="${INK}" stroke-width="${a.sw || 2.8}"/>`;
    }
    return `<g transform="translate(1.5 1.5)">${col}</g><g mask="url(#${maskId})">${dots}</g><g stroke-linejoin="round" stroke-linecap="round">${ink}</g>`;
  }
  const DEFS = (d, m) => `<pattern id="${d}" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="1.7" cy="1.7" r=".85" fill="${INK}" opacity=".5"/></pattern>` +
    `<linearGradient id="${m}g" x1="0" y1="0" x2="1" y2="1"><stop offset=".48" stop-color="#000"/><stop offset=".8" stop-color="#fff"/></linearGradient><mask id="${m}" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32"><rect width="32" height="32" fill="url(#${m}g)"/></mask>`;
  const BODY = {}; for (const n in P) BODY[n] = layers(n, 'zhDots', 'zhMask');
  let defsAdded = false;
  function addDefs() {   /* one shared <defs> for every inline icon (kept rendered: refs into display:none SVGs break in Chrome) */
    if (defsAdded || typeof document === 'undefined' || !document.body) return; defsAdded = true;
    const d = document.createElement('div'); d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = `<svg width="0" height="0" aria-hidden="true"><defs>${DEFS('zhDots', 'zhMask')}</defs></svg>`; document.body.appendChild(d);
  }
  const svg = (n, px = 26) => { if (!P[n]) return ''; addDefs(); return `<svg class="zi" viewBox="0 0 32 32" width="${px}" height="${px}" aria-hidden="true">${BODY[n]}</svg>`; };
  const standalone = (n, px = 96, id = 'z') => P[n] ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${px}" height="${px}"><defs>${DEFS(id + 'd', id + 'm')}</defs>${layers(n, id + 'd', id + 'm')}</svg>` : '';
  const cache = {};
  function img(n) { if (!P[n] || typeof Image === 'undefined') return null; if (cache[n]) return cache[n]; const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(standalone(n)); return (cache[n] = im); }
  if (typeof Image !== 'undefined') for (const n in P) img(n);   // decode early so the first draw has them
  const EMOJI = { '💧': 'water', '🍖': 'food', '⚙️': 'parts', '⚙': 'parts', '🪵': 'wood', '🪨': 'stone', '🧵': 'cloth', '⛽': 'fuel', '🎒': 'stash', '⚡': 'power',
    '❤️': 'heart', '♥': 'heart', '❤': 'heart', '★': 'star', '⭐': 'star', '🔬': 'research', '✔': 'check', '✅': 'check', '✓': 'check', '✕': 'cross', '✗': 'cross', '✘': 'cross', '✖': 'cross',
    '⚠️': 'warn', '⚠': 'warn', '🔥': 'fire', '👷': 'worker', '☠️': 'skull', '☠': 'skull', '💀': 'skull', '🏴': 'flag', '🛡️': 'shield', '🛡': 'shield',
    '🏠': 'home', '🏡': 'home', '🏚': 'ruin', '🏚️': 'ruin', '🔒': 'lock', '🔓': 'unlock', '⚔️': 'fight', '⚔': 'fight', '🌙': 'moon', '☀️': 'sun', '☀': 'sun', '🌤': 'cloud', '☔': 'rain', '🌧': 'rain', '⛈': 'storm', '❄️': 'snow', '🌨': 'snow',
    '🏆': 'trophy', '🏅': 'renown', '🎖️': 'renown', '🔨': 'build', '🛠': 'build', '⚒️': 'build', '📜': 'log', '📦': 'box', '🎁': 'gift', '🎉': 'party', '🥳': 'party', '💤': 'sleep', '💊': 'pill',
    '🔧': 'wrench', '🧰': 'toolbox', '🪓': 'axe', '⛏': 'pick', '🔍': 'search', '💾': 'save', '📻': 'radio', '🛏': 'bed', '🛏️': 'bed', '📈': 'train', '👤': 'person', '🧑': 'person', '🐕': 'pet', '👶': 'baby', '🧒': 'baby',
    '💑': 'couple', '🤒': 'sick', '🕯️': 'candle', '🕯': 'candle', '🧟': 'zombie', '🧱': 'wall', '👥': 'people', '🧭': 'explore', '📖': 'guide', '🥫': 'meal', '🍲': 'meal', '✚': 'medic', '🚑': 'medic', '🏥': 'medic', '🩺': 'medic',
    '🛒': 'shop', '💪': 'strong', '🎶': 'music', '🌱': 'sprout', '❓': 'question', '❔': 'question', '🚪': 'door', '⏸': 'pause', '💬': 'chat', '💭': 'chat', '⏰': 'clock', '🗺️': 'map', '🗺': 'map',
    '📣': 'alarm', '📢': 'alarm', '🩸': 'blood', '⛺': 'tent', '🏕': 'tent', '🏰': 'fort', '🔊': 'sound', '🔉': 'soundLow', '🔇': 'soundOff', '⌖': 'locate',
    '😊': 'happy', '🙂': 'happy', '😄': 'happy', '😌': 'happy', '👍': 'happy', '🙏': 'happy', '👌': 'happy', '😂': 'laugh', '😅': 'laugh', '😤': 'angry', '😠': 'angry', '😰': 'scared', '😱': 'scared', '😨': 'scared', '🆘': 'bang',
    '😢': 'sad', '😟': 'sad', '😞': 'sad', '😩': 'sad', '🥱': 'tired', '😴': 'tired', '😋': 'yum', '😎': 'cool', '😣': 'hurt', '🫂': 'love', '💥': 'bang' };
  /* DOM: swap emoji in UI text for icons. Faces stay as text in the DOM (survivor cards); canvas emotes use the mood icons. */
  const DOM_SKIP = new Set(['😊', '🙂', '😄', '😌', '👍', '🙏', '👌', '😂', '😅', '😤', '😠', '😰', '😱', '😨', '🆘', '😢', '😟', '😞', '😩', '🥱', '😴', '😋', '😎', '😣', '🫂', '💥']);
  const esc = (e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const RE = new RegExp('(' + Object.keys(EMOJI).filter((e) => !DOM_SKIP.has(e)).sort((a, b) => b.length - a.length).map(esc).join('|') + ')\\uFE0F?', 'g');
  const SPLIT = new RegExp('(' + Object.keys(EMOJI).sort((a, b) => b.length - a.length).map(esc).join('|') + ')\\uFE0F?', 'g');
  function split(t) { const out = []; let last = 0, m; SPLIT.lastIndex = 0; while ((m = SPLIT.exec(t))) { if (m.index > last) out.push({ t: t.slice(last, m.index) }); out.push({ i: EMOJI[m[1]] }); last = m.index + m[0].length; } if (last < t.length) out.push({ t: t.slice(last) }); return out; }
  function swap(root) {
    if (!root) return; const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentNode && n.parentNode.closest && n.parentNode.closest('.zi-t, script, style, textarea') ? NodeFilter.FILTER_REJECT : (RE.lastIndex = 0, RE.test(n.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
    const list = []; let n; while ((n = tw.nextNode())) list.push(n);
    for (const t of list) { RE.lastIndex = 0; const f = document.createDocumentFragment(); let last = 0, m; const v = t.nodeValue;
      while ((m = RE.exec(v))) { if (m.index > last) f.appendChild(document.createTextNode(v.slice(last, m.index))); const sp = document.createElement('span'); sp.className = 'zi-t'; sp.innerHTML = svg(EMOJI[m[1]], 18); f.appendChild(sp); last = m.index + m[0].length; }
      if (last < v.length) f.appendChild(document.createTextNode(v.slice(last))); t.parentNode.replaceChild(f, t); }
  }
  function watch(ids) { for (const id of ids) { const el = document.getElementById(id); if (!el) continue; swap(el); new MutationObserver(() => swap(el)).observe(el, { childList: true, subtree: true, characterData: true }); } }
  const api = { svg, img, standalone, EMOJI, swap, watch, split, names: Object.keys(P), PAL, INK };
  if (typeof window !== 'undefined') window.ZHIcons = api; if (typeof module !== 'undefined') module.exports = api;
})();
