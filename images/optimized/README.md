# Optimized homepage images

These WebP files are resized from the existing repository images using sharp 0.35.5 and cwebp (the commands are listed per file), without generating or replacing artwork. Filenames contain the first 12 hexadecimal characters of their SHA-256 content hash.

- `kamizan-avatar`: `images/icon_new.jpg`, centred square crop (683×683 from y=170) with `cwebp -q 82 -m 6 -metadata none -crop 0 170 683 683 -resize <w> <w>`. Sizes: 96 and 192 pixels.
- `spake`, `spkb`, `fms`: their matching `images/projects/*.png` files, resized to 64 and 128 pixels with `cwebp -q 80 -alpha_q 100 -m 6 -metadata none -resize <w> <w>`. Lossy colour with lossless-quality alpha keeps the transparent edges clean. `spkb-128` uses `-q 75`; its detailed artwork stays above Lighthouse's image-savings threshold at 80.
- `kamitrack`: `images/projects/kamitrack.png`, resized to 60, 90, 120 and 180 pixels to cover 1× and 2× at the mobile/desktop CSS sizes. Lossless WebP encoding preserves the resized pixels and alpha transparency.
- `systems-arena`: a gameplay frame of `/portfolio/` (wave 1), captured in headless Chrome at 2× and resized to 640 and 1280 pixels wide with `cwebp -q 72 -m 6 -metadata none`.

All files omit source metadata. Original images remain available for social previews and fallback use.
