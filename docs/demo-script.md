# Demo script (3 minutes)

**Before you start:** open https://voteguard-360.vercel.app on a phone and a laptop. Sign in on the phone as an observer. The planted story is already in place on four units in Ikeja, Ward 04 (`node scripts/demo-scenario.cjs` re-creates it on a fresh database). Keep unit **LA-IKJ-04-016** empty for the live capture. Test one flow in airplane mode first.

| Time | Say | Do |
|---|---|---|
| 0:00 | "After a vote the number that matters is on one sheet of paper. A photo on a messaging app proves nothing. VOTE-GUARD 360 is an independent evidence layer, not an INEC system." | Show the banner: DEMO DATA, not INEC. |
| 0:20 | "An observer captures the sheet. The fingerprint is taken on the phone, even with no signal." | Phone in **airplane mode**: Capture, choose LA-IKJ-04-016, take a photo of the printed sample sheet. Show "Saved on this phone" and the fingerprint. Say what a fingerprint does and does not prove. |
| 0:50 | "When the signal returns it uploads, the server re-checks the file, reads the figures and checks the arithmetic." | Turn airplane mode off. Watch the receipt appear. Tap "Check the figures": confidence flags, five arithmetic checks, confirm. |
| 1:20 | "Now a unit where two independent people photographed the sheet and the numbers differ." | Open **LA-IKJ-04-012**: "Photos differ". Show the two photos side by side and Party B highlighted (98 vs 89). "We do not say who is right. A person will look." |
| 1:50 | "Anyone can listen to this, and read it in plain words or Pidgin." | Tap **Listen to this result sheet** (English). Switch to Pidgin: text shown, with the honest note that no Pidgin voice exists. Open Settings: large text, high contrast. |
| 2:10 | "A reviewer decides, and the decision is public." | Sign in as reviewer, open the unit, record a decision with a public note. Status becomes "Checked by a reviewer". |
| 2:30 | "Every step is a link in a chain. Anyone can check nothing was changed or removed." | Scroll the step-by-step timeline. Tap "Check that the record has not been changed": all steps link correctly. |
| 2:45 | "Dashboard: units by status, and a collation tracker that compares photo totals to a published figure only when every unit is counted. Synthetic data, neutral language." | Open Dashboard, Ward 04. |
| 2:55 | "Evidence, not verdicts." | Close on the banner. |

## If something fails

- No signal at the venue: the phone queue still works; open the live site for the public pages.
- Camera permission refused: choose a file from the sample sheets folder (`public/sample-result-sheets`).
- Live site down: use the recorded video.
- Never improvise a claim about fraud, a winner, or a real election.

## Sample sheets

`public/sample-result-sheets/`: `sheet-a-clean`, `sheet-a-second-photo`, `sheet-b-altered-figure` (Party B 98 to 89), `sheet-c-bad-arithmetic` (cast 260).
