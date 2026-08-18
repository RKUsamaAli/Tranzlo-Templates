# Rehabilitation Assessment — Clickable HTML Prototype

Static prototype for client sign-off. **No build step, no server, no dependencies** —
open `index.html` in any browser.

```
index.html                 Patient journey landing page — start here
change-notes.html          "What we changed & why" — the client-facing explanation
assessment.html            The Rehabilitation Assessment (sections 1–12 + placeholders)
journey/                   Mocked Registration, Vitals, OPD and Referral screens
assets/js/config.js        ← ALL clinical option lists, catalogues, scales and rules
assets/js/components.js    Shared widget library
assets/js/app.js           Screen wiring, validation, autosave
assets/css/theme.css       Design system
assets/css/print.css       A4 clinical record — prints only what was recorded
docs/…plan.yaml            Staged build plan, full challenge list, open questions
```

## Demo script for the client meeting

| # | Do this | It shows |
|---|---------|----------|
| 1 | Open `index.html`, walk steps 1→4 | Which data flows forward instead of being re-typed |
| 2 | Section 2 — tick a precaution | Red banner pins itself to every screen |
| 3 | Section 2 — add an allergy | Writes to the **patient** record, not this form |
| 4 | Section 3 — type `35` into Walking | Automatic delay flag; try "Not achieved yet" |
| 5 | Section 3 — tick "NICU admission" | Conditional fields appear and become required |
| 6 | Section 5 — tick two respiratory findings, then "Clear" | Exclusive-option multi-select |
| 7 | Section 10 — press "CP baseline" | Select-then-fill grid, correct Left/Right columns |
| 8 | Section 11 — press **NT** on any cell | Not-Tested with a reason |
| 9 | Toggle "Compare with 12-Jul-2026" | Previous values beside each cell |
| 10 | Press **Complete assessment** | Validation summary with clickable links |
| 11 | Press **Print** | A4 record with only what was filled |

Keep "Show change notes" on for the first walkthrough — every change we made is
explained inline, on the screen where it applies.

## The one decision blocking implementation

Range of motion is currently captured in **degrees**. Your original form used a
**0–4 score**. Both are built; flip `romMode` in `assets/js/config.js` between
`'degrees'` and `'graded'` to switch the whole of section 11. See change #2 in
`change-notes.html`.

All data is synthetic. No real patient information appears anywhere.
