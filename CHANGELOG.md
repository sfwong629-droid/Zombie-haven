# Changelog

## V2.9.3
- Survivors face the way they walk: moving left on screen shows the sprite as drawn, moving right shows
  it mirrored. While chasing or attacking they face their target. Facing isn't saved (it re-derives on load).
- Zombies don't turn yet (their art is still the old style).

## V2.9.2
- Characters redrawn as chunky pixel art: about 30 art px tall instead of about 80, so each pixel is
  visible on a phone. On-screen character size is unchanged (0.70 tile).
- Pixel-art sprites are now drawn at a whole number of device pixels per art pixel and snapped to the
  device-pixel grid, so pixels stay even squares at every zoom.
- New base-body sheet `assets/characters/v4/Base.png` (idle, 4 walk, working, carrying, down).
  For now all professions use this one body; per-profession hair/skin variants come next.
- Added `docs/ART_STANDARD.md`: one art-pixel size for every sprite going forward.

## V2.9.1 and earlier
See the git history.
