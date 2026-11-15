# Evaluation sheet — New player · build 3D.160 · seed 21 · days 1–20 (stopped at D20 00:00)

Every claim cites a day and a number from the run log (`runs/pilot1/newplayer.jsonl`) or my notes (`runs/pilot1/newplayer_notes.md`).

**Read this first.** For 19 days the game refused every building I tried to place: 36 of 41 `build` commands answered "no free land: expand" (first D1 17:00, last D19 08:00). I ended at level 1 with 2 buildings (HQ + the Rain Barrel from D1 12:00). So this sheet is the experience of a new player who is locked out of the town-building part of a town-builder. I cannot tell from the outside whether that is the game or the test tool's placement; either way it is what I got, and it colours every score below. At D20 00:00 the same command suddenly worked (farm ok, canteen ok) with nothing visibly changed.

Two things about how I played that the owner should know when reading the log:
- From D6 I ran the daytime as a fixed routine through a small script that only calls zh.js (send the 2–3 healthiest to Abandoned Houses; take a trip choice only at 60 %+, otherwise the safe button; pay the toll; treat the sick; welcome newcomers only with a free bed and food ≥ 8). It stopped for me on every card it had not seen before. I did this because there was nothing else left to decide, which is itself a finding.
- I made three clumsy moves a careful player might not: `walls` with no number twice (D2 08:00 wood 27 → 1; D5 11:00 wood 40 → 0) and poking `event bonfire / policy produce / post / cart` at D3 17:00 without knowing their cost (food 7 → 3, scrap 24 → 19, wood 31 → 25).

## Fun score: 2 / 10
One good first hour and a handful of nice cards, then 18 days of the same Low-risk trip to stay just above starvation, at level 1, with the Build menu refusing me every morning.

## Three moments that raised it
1. D11 08:00 — "A WANDERING MEDIC … Ask for treatment" → "PATCHED UP. Everyone is treated": all 8 people went to 100 % (from Lena 60 %, Maya 74 %, Marcus 75 %). One tap, an effect I could see at once.
2. D5 08:00–11:00 — food 0, renown 59/60; the Supply drop card ("Send Lena & Maya") came back with "+11" food, then a bonfire took renown to 68 and Expand finally said ok. For ten minutes I thought I was unstuck.
3. D15 08:00 → D17 08:00 — I sent 2 medicine to Greenwater's sick child (meds 5 → 3); two days later "THE CHILD IS WELL … +12 food · +2 cloth" arrived on a morning when I had just lost someone. A choice of mine came back. (Also D9 00:00 "A NEW COUPLE: Lena and Amy" made me smile.)

## Three moments that lowered it
1. D5 11:00 — Expand worked (wood 60 → 40, scrap 28 → 20, land 0 → 1) after four days of scraping renown from 9 to 68, and then farm, canteen, bench, tent, barrel and bonfire all still said "no free land: expand". The hint changed to "needs a bigger HQ (land tier 2 needs HQ tier 2; HQ is tier 1)" and canUpgrade was empty. This is where I would have deleted the app.
2. D14 10:00 — Abandoned Houses, Low risk: "Stage 1: Maya did not make it." She was at 82 % at 08:00. No card, no choice, one line in a report, on the safest trip the game has. On D17 06:00 the morning card said "Lost: 1 / We light a candle" and Eli (82 % at D16 08:00) was gone from my list; nothing I was shown ever named him or said how.
3. D2 00:00 — the radio tells me "build a Garden Plot … drop it on open ground" while the game has been refusing exactly that since D1 17:00 and goes on refusing it until D19 08:00. Meanwhile food went 14 (D1) → 1.1 (D3 08:00) → 0 (D4 08:00, D5 08:00, D8 08:00, D16 08:00). The tutorial teaches the one step the game will not let me do.

## Waiting with nothing to do
- Every night, D1–D19: 12 game hours (20:00–08:00) of each 36-hour session where all I can do is read the morning card. With no buildings there is nothing to queue, upgrade or research (research stayed 0 from D1 to D20).
- Days when nobody was fit to go out: D10 11:00–17:00, D13 11:00–17:00, D16 08:00–14:00, D18 08:00–14:00 — 6 game hours each of literally no available action (no squad above half health, nothing buildable).
- Resources with nowhere to go: wood sat at 55–60 from D8 to D17, scrap rose 41 → 73 (D8 → D20), renown 68 → 335 after the D5 expand with no use I could find.
- The away periods gave almost nothing: every one credited "8 game hours" and 1–2 water (e.g. D2 20:00 water +1.56; D4 08:00 +1.34), whether I was away 10 or 14 h.

## Over too quickly or too easy
- Nothing about the town was too easy. The only thing over too quickly was the tutorial: the radio guided me for one step (barrel, D1 08:00–12:00), then said "put down three" walkers and never followed up in anything I saw.
- Sick cards are free wins: D9 08:00 Ben, D13 08:00 Marcus — "Treat (2 scrap, 3 water)" → "will be fine", with scrap at 45–51 and no reason ever to pick the other button.
- Toll Kings, D6 08:00 and D12 08:00: 8 scrap out of 36 and 57. No decision there.
- Boss nights sounded huge and passed without me: D6 21:00 Butcher, D9 21:00 Stalker, D12 21:00 Butcher, D15 21:00 Bloater Queen, D18 21:00 Gatling Boss. I never learned whether any boss was killed; the morning card only counts "Walkers stopped".

## Stuck
- **Where:** D1 17:00 to D19 08:00, level 1, "Buildings standing: 2/6".
- **What I tried:** every building in the list (D1 23:00: bench, canteen, bonfire, tent, crates; D5 11:00: farm, canteen, bench, tent, barrel, bonfire); day and night; closing the fence (`walls` D2 08:00 placed 25, D5 11:00 placed 40, both "sealed": false); earning 60 renown and expanding (D5 11:00); `levelup` and `upgrade hq` (D6 08:00, both refused with no reason); farm again every morning D6–D19.
- **Got out?** No, not by anything I did. At D20 00:00 farm and canteen were accepted ("farm (site)", "canteen (site)"), at the minute my run ended. I don't know why. The only things I can see that were different: it was 00:00, a baby had just been born, and brokenWalls was 1.
- **Second stuck, inside the first:** food. 51 expeditions, 49 of them Abandoned Houses, each bringing roughly 3–7 food against 7–8.5 eaten per day, with 11 trip reports containing a collapse. Food was above its starting 14 exactly twice at a check (D11 21:00: 17; D17 20:00: 16.5).

## Did the game serve your goal or get in its way?
My goal was the one the game gave me: "People living here 6, Buildings standing 6". People was done on D2 12:00 (6/6). Buildings got in the way for the whole run, and the game never explained it in words I could act on: "no free land: expand" sent me to Expand, Expand sent me to "a bigger HQ", and the HQ had no upgrade on offer.
The radio served me for four hours and then went silent: every `news` list I received after D2 20:00 (the first `away`) was empty, so from session 2 on I had cards only. If that is the tool and not the game, then this pilot did not test the radio at all after day 2.
The game also undercut itself on trust: the weekly review gave "Supplies: 18/20" (D8 00:00, the morning food was 0) and "Supplies: 20/20" (D15 00:00, food 0.9 the day before and 0 the day after), and the total went up 41 → 50 in the week Maya died and nothing was built.

## Bugs and confusing text
Quoted as shown.
1. "no free land: expand" — 36 times, D1 17:00–D19 08:00, including after a successful expand (D5 11:00). Then ok at D20 00:00.
2. D2 00:00 radio: "build a Garden Plot … drop it on open ground" while that is refused.
3. Trip answers ignored: D2 13:00 I pressed "Treat him" (ok: true); the report says "A SICK STRANGER: no orders came, so Noah (Cautious) chose “Move on”." Again D3 13:00: pressed "Force the shutters", report says "A BARRICADED STORE: no or…" (cut off). Other answers counted (D2 09:00, D3 15:00).
4. Morning card contradicts itself: D4 06:00 "Hurt: Noah, Marcus / Not a scratch. The coffee is still terrible." Same on D5, D6, D7, D8, D9, D14.
5. Morning card lists a returning squad as newcomers: D7 06:00 "Joined: Maya, Ben, Lena"; D11 06:00 "Joined: Amy, Marcus, Ben"; also D9, D12, D13, D14, D16.
6. Duplicate first names: two Noahs from D2 12:00 (I could not tell which one a trip took, D3 11:00), three different Elis offered (D3 16:00, D4 13:00, D5 13:00), a second Maya on D17 after the first died on D14. D14 00:00: "Noah and Noah have grown close and are now a couple." D10 06:00: "Hurt: Noah, Noah, …".
7. D5 13:00 I turned away "Eli Underwood · Engineer · Cautious"; at D5 14:00 "Eli · Civilian L1 · diligent" lives here (8/6). No message says where he came from.
8. Food forecast: "foodPerDay −8.1 … foodDaysLeft 1.7" at D8 20:00 (food 14), then food 5.7 at D9 08:00 — 8.3 gone in 12 hours. Same D2 20:00 6.7 → D3 08:00 1.1 with −5.7 a day shown. Also "Food runs out in about 29 h" at both D2 17:00 and D2 20:00.
9. "Low risk": Maya dead in stage 1 (D14 10:00); collapses in stage 1 at 93 % health (Ben, D13 11:00) and in 11 reports overall. "Short on supplies: the trip is riskier" appears (D3 11:00, D8 11:00, D14 10:00) but I was never told what supplies a trip wants or how to give them.
10. D14: with Marcus & Maya out on "A lost child … Search: about 5 hours" (sent 08:00), the game let me put Maya on a trip at 08:00 and Marcus at 10:00; at 11:00: "Too late / They searched until dark and found nothing."
11. Move-in "request" with no content: only "accept or decline" (D5 20:00, D7, D8, D9). `decline` returned ok: true and the request stayed, stopping play every hour from D5 22:00 to D6 08:00. `accept` cleared it and nobody appeared (beds 8/8).
12. Costs never shown before spending: `walls` (27 wood, then 40 wood, "sealed": false both times), `event sports` (D4 14:00: renown 45 → 52, food 8 → 5, water 21.5 → 17.5), `post`, `cart`. Refusals without a reason: `event bonfire` and `event sports` D4 17:00, `event market` D4 14:00, `levelup` and `upgrade hq` D6 08:00, `expand` D2 08:00.
13. "Trade 6 food for 10 water" (D3 08:00, D10 08:00, D18 08:00): I could not tell whether I give the food or get it.
14. Build list says "3 wood, 1 mat"; my stock says "scrap". Nothing says mat = scrap. Garden Plot is "4 wood" in the list and "⚙ 3 🪵 6 ★ 4" on the radio (D2 00:00).
15. "Claim the reward from the alert or the Goals screen" (D1 13:00, D2 07:00, D2 09:00): no way to do that here; I don't know if I was paid.
16. Things I own and cannot see or use: dog Bandit ("Give the dog to a survivor from their Gear tab", D2 08:00), Reading Glasses, Hiking Backpack, Lucky Charm, Back Brace, Lifting Gloves, Running Shoes, Scope Goggles, Machete. Trader at D5 14:00 shown only as "0: item, 1: item, 2: item, 3: pet, 4: ex, 5: rp".
17. Expedition reports are cut off at about 330 characters in what I was shown and in the log, so the end of every trip (and possibly Eli's death) is unreadable.
18. Health that does not move: Noah (Engineer) exactly 59 % every morning D4–D10; Lena 21 % from D17 08:00 to D19 08:00.
19. D1 09:00, before I had built anything: "Lena can't reach a storage door with their load. Check that storage and HQ entrances aren't walled off and that the fence has a gate."
20. D20 00:00 "Ivy will grow up in the Houses"; D9 00:00 "more Houses = more room" — there is no "House" in my build list, only "Tent".
21. D6 00:00 "LEGACY: FAR HORIZONS … 1 of 8 legacy goals. Complete 4 and reach ★5 to call for the convoy." First and only mention of legacy goals, ★ and a convoy.

## The one change you would make
When a building cannot be placed, say why in the player's words and offer the way out on the same card — and never let the radio ask for a building the game is currently refusing. "no free land: expand" cost me the whole run: 36 refusals over 19 days, one wasted expand, level 1 at day 20. (For the pilot itself: check first whether the test tool's `build` can find a spot on seed 21 after the first building, and whether `news` survives an `away`; if both are tool faults, this run measured the tool more than the game.)
