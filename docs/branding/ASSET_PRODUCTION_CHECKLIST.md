# UmaKuma Asset Production Checklist

This checklist converts the brand prompt output into a production workflow for real, shippable files.

## Why this exists

Image chat tools often return preview/composite images, not true downloadable RGBA assets.
Use this checklist to recreate/export final assets correctly in Figma, Illustrator, or Photoshop.

## Final asset manifest (required filenames)

Recommended long-term: create SVG masters and PNG exports for vector-friendly assets.

Practical AI workflow: PNG-first is acceptable.
Use generated PNGs in the site first, then vectorize key assets later if needed.

Vector-friendly assets ideally have both formats:
- `.svg` master
- `.png` production export

1. `umakuma-logo-primary.svg` + `umakuma-logo-primary.png`
2. `umakuma-text-logo.svg` + `umakuma-text-logo.png`
3. `umakuma-wordmark.svg` + `umakuma-wordmark.png`
4. `umakuma-icon-horse.svg` + `umakuma-icon-horse.png`
5. `umakuma-icon-bear.svg` + `umakuma-icon-bear.png`
6. `umakuma-mascot-horse.svg` + `umakuma-mascot-horse.png`
7. `umakuma-mascot-bear.svg` + `umakuma-mascot-bear.png`
8. `umakuma-mascots-hug.svg` + `umakuma-mascots-hug.png`
9. `umakuma-mascots-study.svg` + `umakuma-mascots-study.png`
10. `umakuma-mascots-ride.svg` + `umakuma-mascots-ride.png`
11. `umakuma-stickers-horse.svg` + `umakuma-stickers-horse.png`
12. `umakuma-stickers-bear.svg` + `umakuma-stickers-bear.png`
13. `umakuma-stickers-duo.svg` + `umakuma-stickers-duo.png`
14. `umakuma-hero-2560x1440.png`
15. `umakuma-ad-1200x630.png`
16. `umakuma-social-1200x630.png`

## Character consistency rules (non-negotiable)

- Horse (Uma) is always on the left in paired scenes.
- Bear (Kuma) is always on the right in paired scenes.
- Horse must have one bent/limp ear.
- Bear must have one opposite-color accent eye.
- Both mascots have a subtle hair tuft.

## Visual style rules

- Thick, uniform outer lines.
- Simpler inner details at lighter weight.
- Flat color fills; avoid heavy gradients.
- Sticker/badge silhouette readability at small sizes.

## Color palette

- Primary: `#2D7CFF`
- Coral: `#FF5D73`
- Mint: `#23C6A8`
- Sky: `#EEF4FF`
- Text navy: `#16223A`
- Neutral light: `#E5EAF3`
- Neutral mid: `#A8B3C7`

## Export settings

For logos, icons, mascots, and sticker assets:
- Minimum shippable format: PNG
- Preferred master format: SVG
- Export: PNG from SVG when available
- Color: RGBA
- Bit depth: PNG-32
- Background: transparent
- Scale: 2x or 4x source artboard
- Convert text to outlines before final SVG export if font portability is needed
- If AI cannot generate real transparency, export/clean manually from a plain white or solid color background.

For hero/ad/social:
- PNG is acceptable with opaque background.

## Quality validation (required)

For every transparent PNG:
1. Place file over black background.
2. Place file over white background.
3. Place file over saturated color background.
4. Zoom to 400% and check edges for halo/fringing.
5. Confirm no checkerboard pixels are baked in.

For every SVG master:
1. Open in a second editor/viewer to confirm portability.
2. Confirm paths render correctly with no missing fonts.
3. Confirm stroke widths remain readable at small display sizes.

## Folder placement in this repo

- Logos: `public/brand/logos`
- Mascots: `public/brand/mascot`
- Social/hero/ad: `public/brand/social`
- Patterns: `public/brand/patterns`
- Stickers: `public/brand/stickers`
- Favicons/icons: `public/brand/favicons`
- Raw AI boards/reference: `docs/branding/raw-ai`

## Suggested naming by folder

### Logos
- `public/brand/logos/umakuma-logo-primary.svg`
- `public/brand/logos/umakuma-logo-primary.png`
- `public/brand/logos/umakuma-text-logo.svg`
- `public/brand/logos/umakuma-text-logo.png`
- `public/brand/logos/umakuma-wordmark.svg`
- `public/brand/logos/umakuma-wordmark.png`

### Icons
- `public/brand/favicons/umakuma-icon-horse.svg`
- `public/brand/favicons/umakuma-icon-horse.png`
- `public/brand/favicons/umakuma-icon-bear.svg`
- `public/brand/favicons/umakuma-icon-bear.png`

### Mascots
- `public/brand/mascot/umakuma-mascot-horse.svg`
- `public/brand/mascot/umakuma-mascot-horse.png`
- `public/brand/mascot/umakuma-mascot-bear.svg`
- `public/brand/mascot/umakuma-mascot-bear.png`
- `public/brand/mascot/umakuma-mascots-hug.svg`
- `public/brand/mascot/umakuma-mascots-hug.png`
- `public/brand/mascot/umakuma-mascots-study.svg`
- `public/brand/mascot/umakuma-mascots-study.png`
- `public/brand/mascot/umakuma-mascots-ride.svg`
- `public/brand/mascot/umakuma-mascots-ride.png`

### Stickers
- `public/brand/stickers/umakuma-stickers-horse.svg`
- `public/brand/stickers/umakuma-stickers-horse.png`
- `public/brand/stickers/umakuma-stickers-bear.svg`
- `public/brand/stickers/umakuma-stickers-bear.png`
- `public/brand/stickers/umakuma-stickers-duo.svg`
- `public/brand/stickers/umakuma-stickers-duo.png`

### Social
- `public/brand/social/umakuma-hero-2560x1440.png`
- `public/brand/social/umakuma-ad-1200x630.png`
- `public/brand/social/umakuma-social-1200x630.png`

## Ready-to-implement step

Once these files are placed in the folders above, wire them into app metadata and UI surfaces:
- Header/logo usage
- Favicon/app icon
- Social OG image
- Homepage hero
