Zombie Haven V1.1.3 VERIFIED
Critical root cause fixed:
- The HUD's first .row div was never closed before the second row began.
- This accidentally nested #world inside the fixed-height #hud.
- Because #world uses top:76px and bottom:94px, its computed height became invalid/zero, producing the blank game area even when JavaScript was valid.

Additional hardening:
- Explicit DOM references replace implicit ID globals for iOS/Safari reliability.
- Visible runtime crash reporter added.
- Previous JavaScript parse, COLS/ROWS, FX layer and residency fixes retained.
- JavaScript passes node --check.
- HTML nesting sanity check passes.
