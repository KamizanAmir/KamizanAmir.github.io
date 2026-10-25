# Design direction: kamizanamir.my

Concept by Kamizan, 2026-10-22. Replaces the engineering-document direction of 2026-10-14. Applies to the homepage (`index.html`) and `thanks.html`, which share `styles.css`. The arcade at `/portfolio/` keeps its own style.

## Identity: the terowong

The visitor arrives in first person in a quiet, empty space. One light glows out of a hole in the floor. Walking into it tips them over the rim into a well, and they fall. The fall never lands on its own: each dive drops them to the next stop, where the System appears (the holographic windows of Chinese and Japanese "system" dramas): the record in front of their eyes, full details to the left, data and links to the right. The windows follow their gaze; turning or drifting brings a side window in front. Whatever they press, their gloved hand presses too. That stop's clay object tumbles alongside. Contact is the last stop. Diving past it finds the bottom.

Revised by Kamizan, 2026-10-25: free fall replaces the walk-through tunnel; WASD and an on-screen analog stick move the visitor in the void and drift them inside the well; the visitor sees their own body (charcoal sleeves and gloves, indigo jeans, off-white sneakers); one stop per project; the bottom of the well ends in a blood splatter with a "Try again" that respawns them in the void. Later the same day: the System replaces the flat panel and the details dialog, so reading never stops the fall, and each section switches the System's colour.

Feel reference: kiabai.me (soft, tactile, toy-like 3D, warm "deck" surfaces, glass dialogs, day and night). It is a reference for feel only: the scene, the metaphor and the layout are Kamizan's own.

Dial: ENERGY 3 / RHYTHM 3 / MOTION 3

## Two views of one content

- **Tunnel view** (default where WebGL2 works): the 3D experience in `js/tunnel/`.
- **Page view**: the same content as a readable page. It is the fallback without WebGL2, the default under `prefers-reduced-motion`, and the target of deep links such as `/#contact`. The page is the single source of truth: the System builds its windows from the page's `data-exhibit` elements and lends the real contact form.

## Palette

| Token | Day | Night | Use |
|---|---|---|---|
| `--deck` | `#eeebe4` | `#1e2024` | Page and void background |
| `--surface` | `#f7f5f0` | `#2a2d32` | Raised tiles, dialog body |
| `--ink` | `#1d1f22` | `#eeebe4` | Text, primary buttons |
| `--ink-2` | `#5a5650` | `#a9a49b` | Secondary text (6.1:1 day, 6.6:1 night) |
| `--accent` | `#9a5200` | `#f2a541` | The light. Used for the light itself, the ring lights in the well, and the focus ring outside the System. Nowhere else. |

The System has one colour per section, so each dive visibly switches its mode. It lights the windows' glass, frame and glow, and the current gauge node; text uses a paler mix of it, which holds 6.4:1 or better on the dark glass even over a bright wall.

| Section | Colour |
|---|---|
| Entrance | `#5ad7ff` |
| 01 Government systems | `#4fb3ff` |
| 02 Personal projects | `#a98bff` |
| 03 Systems Arena | `#5ef0a4` |
| 04 Profile | `#ffc15e` |
| 05 Career | `#ff7eb6` |
| 06 Toolkit & education | `#46e0d2` |
| 07 Contact | `#ff9b5e` |

Blood red (`#5a0606` to `#9c0f0f`) appears only on the end screen, by Kamizan's choice.

The 3D scene uses warmer, lighter versions of the same hues (clay walls, amber ring lights) so the page and the scene read as one place.

## Typography

- Funnel Display for headings and signs: its letters are cut with funnel-shaped notches, which echoes the hole and the tunnel.
- Funnel Sans for everything readable, from the same family so the voice stays single.
- No wide-tracked uppercase labels. Station numbers are plain numerals ("01"). The System's labels are bracketed in normal case ("[ System ]", "[ Details ]", "[ Data ]") and its notices start with "Ding!".

## Motif

The arch: the tunnel's cross-section. It is the logo mark, the Entrance node on the gauge, and the shape of the loader.

## Surfaces

- Raised tiles (soft light and dark shadow pair) mark things you can pick up: project tiles, the profile card, the contact form. Plain content sits flat on the deck.
- Glass is used on one element only: the System's windows. They are dark holographic glass with faint scanlines and corner brackets, squarer (10px) than the page's tiles so they read as the System speaking, not the page.
- The void floor carries faint tile joints. Reason: without them a first-person walk on a flat plane has no sense of speed or distance.

## Motion

- The fall is the one big motion moment: stepping off the rim, the dive between stops, and the impact at the bottom. Under `prefers-reduced-motion` the step-off and each dive become fades, the cruise slows to a drift, streaks and head-bob are off, the end screen appears without shake or running drips, and the page view is the default.
- The impact follows the body: the feet land and the knees fold, the body goes over backwards like a plank pivoting on its feet, and the blood lands when the head hits the floor. The visitor ends up lying on their back looking down at their own jeans and shoes, hands limp at their sides. Under reduced motion they are shown already lying there.
- The System's windows boot from a bright line with one flicker and type their "Ding!" notice; they shut back to a line when you dive. A pressed window ripples where the hand's finger lands.
- Everything else moves only when the visitor moves.

## Content rules

- The four key figures (7+ years, 20+ systems shipped, 3 government platforms live, 8 languages and frameworks) are confirmed accurate by Kamizan.
- No em dashes. Date ranges use an en dash.
- 3D objects are built in code from simple shapes. Any of them can later be swapped for a `.glb` Kamizan supplies.
