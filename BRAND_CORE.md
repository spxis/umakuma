# UmaKuma Core Brand Prompt

Use this first. It keeps the image-generation request small and focused.

## Base Spec

You are creating core launch assets for UmaKuma, a friendly Japanese study and progress tracker.

Tone: warm, playful, smart, encouraging, family-friendly.

Style:
- Thick-line sticker/badge aesthetic.
- Bold uniform outer outlines.
- Flat color blocks with minimal gradients.
- Simple silhouette-first forms that read at small sizes.
- No photorealism, no clutter, no copied existing characters.

Palette:
- Primary blue: #2D7CFF
- Coral: #FF5D73
- Mint: #23C6A8
- Soft sky: #EEF4FF
- Text navy: #16223A

Mascots:
- Uma is a horse.
- Kuma is a bear.
- In all paired scenes, horse is always on the left and bear is always on the right.
- Horse has one charming bent/limp ear and a small hair tuft.
- Bear has one opposite-color accent eye and a small hair tuft.
- Keep these features consistent across all outputs.

## Core Assets Only

Generate one asset per request. Do not generate a contact sheet.

1. `umakuma-mascot-horse.png`
   - Horse alone, full body, friendly standing pose.
   - Plain white background if true transparency is unavailable.

2. `umakuma-mascot-bear.png`
   - Bear alone, full body, friendly standing pose.
   - Plain white background if true transparency is unavailable.

3. `umakuma-mascots-study.png`
   - Horse left, bear right, studying together at a small desk with simple kanji cards/books.

4. `umakuma-logo-primary.png`
   - UmaKuma wordmark with horse left and bear right.
   - Keep mascot heads simple enough for header use.

5. `umakuma-wordmark.png`
   - Text-only UmaKuma wordmark, no mascots.
   - Friendly rounded geometric style.

6. `umakuma-icon-horse.png`
   - Horse-only app icon/avatar crop.
   - Bent ear must be visible.

7. `umakuma-icon-bear.png`
   - Bear-only app icon/avatar crop.
   - Opposite-color accent eye must be visible.

8. `umakuma-hero-2560x1440.png`
   - Homepage hero image with both mascots studying together.
   - Warm Japanese-learning atmosphere, soft sky, simple progress/kanji motifs.

## Copy/Paste Single-Asset Template

```text
Generate exactly ONE UmaKuma core brand asset.

Asset now: <FILENAME>

Use the UmaKuma core spec:
- Horse Uma: bent/limp ear, small hair tuft.
- Bear Kuma: one opposite-color accent eye, small hair tuft.
- In paired scenes: horse left, bear right.
- Thick-line sticker/badge style, flat colors, clean silhouette.

Output a clean high-resolution PNG image first.
If true transparency is supported, use it.
If not, use a plain white background with the subject fully isolated for easy background removal.
Return only this one asset, not a contact sheet.
```

## Recommended First Prompt

```text
Generate exactly ONE UmaKuma core brand asset.

Asset now: umakuma-mascot-horse.png

Use the UmaKuma core spec:
- Horse Uma: bent/limp ear, small hair tuft.
- Thick-line sticker/badge style, flat colors, clean silhouette.

Output a clean high-resolution PNG image first.
If true transparency is supported, use it.
If not, use a plain white background with the subject fully isolated for easy background removal.
Return only this one asset, not a contact sheet.
```
