# Kamizan Amirudin — portfolio

A responsive, static portfolio and a playable 3D arcade. No application build step is required.

```sh
python3 -m http.server 8080
```

Visit `http://localhost:8080/` for the portfolio and `/portfolio/` for Systems Arena. Serve over HTTP so the arcade's JavaScript modules can load.

- `index.html`, `styles.css`, `script.js`: portfolio, projects, career history, resume link and contact form.
- `portfolio/`: 3D arcade, touch/keyboard controls and skill stories. See its README for gameplay and implementation details.
- `assets/vendor/`: pinned Three.js module and its MIT license; the game loads locally without a CDN.
- `kamitrack.html`: existing KamiTrack product page.
- `thanks.html`: contact confirmation using the portfolio's shared styles.

The portfolio uses Google Fonts and Font Awesome, with system font fallbacks. Contact submission retains the existing FormSubmit service; local checks do not send messages.

Run the combat regression checks with Node 22 or later:

```sh
node --test tests/arena-state.test.mjs
```
