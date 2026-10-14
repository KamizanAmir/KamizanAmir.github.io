# Design direction: kamizanamir.my

Chosen by Kamizan on 2026-10-14. Applies to the homepage (`index.html`) and `thanks.html`, which share `styles.css`. The arcade at `/portfolio/` keeps its own style.

## Identity

The portfolio reads like a well-made engineering document: a title block, numbered clauses, registers and tables, ruled lines, figure captions. It ties to the work itself (MES/ERP, plant floors, government asset registers) and should come across calm and credible to employers and clients.

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1

## Palette

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f7f6f1` | Page background, the "sheet" |
| `--ink` | `#171a17` | Text, strong rules, the inverted arcade section |
| `--ink-2` | `#4f554c` | Secondary text, labels (7.0:1 on paper) |
| `--rule` | `#cfd1c8` | Hairlines between rows (decorative only, never the only boundary of a control) |
| `--redline` | `#b3261e` | The single accent: the revision/redline mark. Used for the current role, the revision line and the focus ring. Nowhere else. |

## Typography

- IBM Plex Sans (variable 400 to 700) for everything readable. Chosen because Plex was drawn for technical and engineering documentation.
- IBM Plex Mono 400 for clause numbers, dates, table labels and figure captions: the parts of a document that are reference data.
- No wide-tracked uppercase labels. Labels are sentence case.

## Structure

- Numbered clauses (1 to 7), with sub-clauses (1.1, 1.2) where a section has groups.
- Content as registers and tables, not card grids. Rows separated by hairlines.
- One inverted (ink) block: the Systems Arena section, because it is the one interactive piece.
- Figures carry a caption ("Fig. 2.1 ...") and show real captures only.

## Content rules

- The four key figures (7+ years, 20+ systems shipped, 3 government platforms live, 8 languages and frameworks) are confirmed accurate by Kamizan. Shown as a plain table, not animated counters.
- No em dashes. Date ranges use an en dash.
- No decorative icons, status dots, or arrows on every link.
