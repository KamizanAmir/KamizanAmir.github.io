# Optimized homepage images

These WebP files are resized from the existing repository images using sharp 0.35.5, without generating or replacing artwork. Filenames contain the first 12 hexadecimal characters of their SHA-256 content hash.

- `kamizan-avatar`: `images/icon_new.jpg`, centered square crop to match the existing `object-fit: cover` portrait. Sizes: 44 and 88 pixels. WebP quality 85.
- `spake`, `spkb`, `fms`: their matching `images/projects/*.png` files, resized to 64 and 128 pixels with `cwebp -q 80 -alpha_q 100 -m 6 -metadata none -resize <w> <w>`. Lossy colour with lossless-quality alpha keeps the transparent edges clean. `spkb-128` uses `-q 75`; its detailed artwork stays above Lighthouse's image-savings threshold at 80.
- `kamitrack`: `images/projects/kamitrack.png`, resized to 60, 90, 120 and 180 pixels to cover 1× and 2× at the mobile/desktop CSS sizes. Lossless WebP encoding preserves the resized pixels and alpha transparency.

All files omit source metadata. Original images remain available for social previews and fallback use.
