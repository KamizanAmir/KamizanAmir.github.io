# Design direction: kamizanamir.my

Concept by Kamizan, 2026-10-22. Replaces the engineering-document direction of 2026-10-14. Applies to the homepage (`index.html`) and `thanks.html`, which share `styles.css`. The arcade at `/portfolio/` keeps its own style.

## Identity: the terowong

The visitor arrives in first person in a quiet, empty space. One light glows out of a hole in the floor. Walking into it drops them down a lit shaft into a tunnel (terowong) where the work hangs on the walls like exhibits in a pedestrian subway. The tunnel ends in light, and that light is where Contact lives.

Feel reference: kiabai.me (soft, tactile, toy-like 3D, warm "deck" surfaces, glass dialogs, day and night). It is a reference for feel only: the scene, the metaphor and the layout are Kamizan's own.

Dial: ENERGY 3 / RHYTHM 3 / MOTION 3

## Two views of one content

- **Tunnel view** (default where WebGL2 works): the 3D experience in `js/tunnel/`.
- **Page view**: the same content as a readable page. It is the fallback without WebGL2, the default under `prefers-reduced-motion`, and the target of deep links such as `/#contact`. The page is the single source of truth: the tunnel reads its panels and dialogs from the page's `data-exhibit` elements.

## Palette

| Token | Day | Night | Use |
|---|---|---|---|
| `--deck` | `#eeebe4` | `#1e2024` | Page and void background |
| `--surface` | `#f7f5f0` | `#2a2d32` | Raised tiles, dialog body |
| `--ink` | `#1d1f22` | `#eeebe4` | Text, primary buttons |
| `--ink-2` | `#5a5650` | `#a9a49b` | Secondary text (6.1:1 day, 6.6:1 night) |
| `--accent` | `#9a5200` | `#f2a541` | The tunnel light. Used for the light itself, the tactile guide strip on the tunnel floor, the current station, and the focus ring. Nowhere else. |

The 3D scene uses warmer, lighter versions of the same hues (clay walls, amber ring lights) so the page and the scene read as one place.

## Typography

- Funnel Display for headings and signs: its letters are cut with funnel-shaped notches, which echoes the hole and the tunnel.
- Funnel Sans for everything readable, from the same family so the voice stays single.
- No wide-tracked uppercase labels. Station numbers are plain numerals ("01").

## Motif

The arch: the tunnel's cross-section. It is the logo mark, the station sign shape, and the top edge of the dialog media.

## Surfaces

- Raised tiles (soft light and dark shadow pair) mark things you can pick up: project tiles, the profile card, the contact form. Plain content sits flat on the deck.
- Glass is used on two elements only: the project dialog and the tunnel station rail.
- The void floor carries faint tile joints. Reason: without them a first-person walk on a flat plane has no sense of speed or distance.

## Motion

- The fall is the one big motion moment. Under `prefers-reduced-motion` it becomes a fade, head-bob is off, and the page view is the default.
- Everything else moves only when the visitor moves.

## Content rules

- The four key figures (7+ years, 20+ systems shipped, 3 government platforms live, 8 languages and frameworks) are confirmed accurate by Kamizan.
- No em dashes. Date ranges use an en dash.
- 3D objects are built in code from simple shapes. Any of them can later be swapped for a `.glb` Kamizan supplies.
