# Arcade CV

A side-scrolling, playable version of the CV at [`../index.html`](../index.html).
Same content, same palette, different register.

- **Eight zones** along one continuous world: start, profile, stack, quests,
  work, skills, contact, end.
- **Zone rail** in the header is a map *and* a fast-travel control — click a
  marker, or press `1`–`8`. Nobody hiring should have to walk 15,000 pixels to
  reach the experience section.
- **Controls**: arrows or `WASD` to walk, `Space` to jump, `Esc` for the menu.
- **On a phone**: swipe horizontally anywhere to walk, or use the on-screen
  pad. Vertical swipes scroll the panel you're reading. The rail is replaced by
  a **zone sheet** (the map button in the header) — eight markers on a 320px
  rail sit 2px apart, which is not a control.
- **Deep links** work: `/portfolio/#quests` lands on that zone.
- **Escape hatch**: `Tab` reveals a skip link to the plain CV, so the game
  never traps a keyboard or screen-reader user.

No build step, no dependencies — `index.html`, `styles.css`, `script.js`.

The content here is a mirror of the main site. When the CV changes, both need
updating; the resume PDF in `resume/` is a copy of the one at the site root.
