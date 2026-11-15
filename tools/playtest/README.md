# Play-testing with agents (claude/zombie-haven-playtest-agents-plan.md)

The game runs with no screen in `server.js` and takes orders over HTTP; a tester (a Claude agent playing a profile from `profiles.md`)
reads the town with `zh.js PORT state [full]` and gives orders (`zh.js PORT help` lists them). Routine taps (trays, bandages, repairs,
breach and rescue alerts) are done by the auto-player's "hands" (`tools/balance/ap.js`, patched at load so it never answers cards).
Plain info cards are closed automatically and their text is passed to the tester in `cardsRead`.

    python3 -m http.server 8765                                            # from the repo root
    node tools/playtest/server.js --port 8811 --seed 21 --log runs/pilot1/newplayer.jsonl
    node tools/playtest/zh.js 8811 state full

- `controls_check.js PORT` proves every order works end to end (needs `PT_DEBUG=1` on the server, which adds `_give` / `_eval`; never give those to a tester).
- An older build for calibration: `git worktree add /root/zh-old <commit>`, serve it on another port, start the server with `--base http://localhost:8766`.
- Every order and its result goes to the run log (JSONL, with day and hour). Sheets (`sheet.md`) must cite it.
- Start a server with a long-lived background job: a server started with `&` from a short shell command can lose its browser when that shell ends.
