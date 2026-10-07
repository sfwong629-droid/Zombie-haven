Zombie Haven V1.5.4 — Approved Graphics Integrated, Clean Runtime Assets

This build uses the approved generated Zombie Haven artwork in the actual game renderer.

V1.5.4 cleanup:
- removed review-card border/separator artifacts from runtime building PNGs
- removed adjacent-sprite fragments from character/zombie animation frames
- game continues to load approved characters, zombies, buildings, terrain, props and UI icons
- exact original approval cards remain in assets/approved_cards/
- APPROVED_ASSET_BOARD.png remains the master art reference
- RUNTIME_ASSET_CHECK.png is generated from the exact runtime PNGs loaded by the game

Validation passed:
JavaScript syntax, character renderer, zombie renderer, building renderer, terrain PNG renderer, UI PNG renderer, building artifact cleanup.
