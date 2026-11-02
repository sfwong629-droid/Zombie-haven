# Town 3D test

`town3d_test_page.html` is the real-time 3D town (three.js): the game's map and roads, palisade and gates, the Medical Tent (real Hunyuan model, `assets/buildings/ai3d/medic/medical_tent_realtime.glb`), stand-in cabins/tower/garden/fire/forest built in code, free-roaming survivors (A* on tiles) and placeholder zombies.

Rebuild: `python3 tools/art/b3d/build_town3d.py OUT.html --mid assets/characters/ai3d_male/realtime/male_mid.glb --lite assets/characters/ai3d_male/realtime/male_lite.glb --tent assets/buildings/ai3d/medic/medical_tent_realtime.glb --notes assets/town3d/notes.html`. Add `?still` to the page URL for headless screenshots (frames are stepped by hand with `step(n)`).
