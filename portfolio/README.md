# Systems Arena

A responsive 3D combat arcade that introduces Kamizan's integration, mobile and infrastructure experience. Built with vanilla JavaScript and a local, pinned Three.js 0.170.0 module (MIT license in `../assets/vendor/THREE-LICENSE.txt`). No build step or runtime CDN is needed for the game.

Serve the repository over HTTP, for example `python3 -m http.server 8080`, and visit `/portfolio/`. JavaScript modules need an HTTP server; opening the HTML directly with `file://` is unsupported.

- Move with WASD / arrows, pulse with Space, dash with Shift, shield with E.
- Touch devices have a direction pad and three ability buttons; controls support simultaneous touches.
- P, Escape, or the pause button pauses. Losing focus and switching tabs also pause.
- Defeat 5, 7, then 9 bugs. Pulses do one damage within 3.25 world units. Enemy health and speed increase each wave.
- Waves restore up to 25 integrity and award 500 points; bugs award 100 points.
- Cooldowns: pulse 0.6s, dash 3s, shield 7s. Dash protects for 0.35s, shield for 2s.
- Ability cards expose actual career details without requiring a win. The main portfolio is always linked, including on WebGL failure.
- Sound is opt-in. Only the personal best is stored locally; blocked storage does not stop play.
- Reduced motion disables decorative bobbing. Game movement remains necessary to play.

`game-state.js` contains combat rules; `script.js` handles rendering, controls and UI. Run the combat checks from the repository root with `node --test tests/arena-state.test.mjs` (Node 22+).

Keep the three skill descriptions in `script.js` in sync with the main portfolio. All original portfolio content is available on the main page; the arcade is a complementary experience.
