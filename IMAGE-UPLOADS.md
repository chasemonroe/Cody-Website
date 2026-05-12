# Image Upload System

The website no longer needs hand-maintained image lists. The gallery is generated from files in `assets/`.

## How To Add Photos

1. Upload new image files anywhere under `assets/`.
2. Include one of these words in the filename:
   - `bathroom` or `bath` for bathroom remodel photos
   - `shower` for shower remodel photos
   - `fence` for fencing photos
   - `concrete` for concrete work photos
3. Run:

```bash
node scripts/generate-gallery-data.mjs
```

That updates `gallery-data.js`, which powers both the gallery page and the homepage carousels.

## GitHub Uploads

If this site is hosted from GitHub Pages, photos can be uploaded through the GitHub web UI into `assets/`. The included GitHub Action regenerates `gallery-data.js` and commits the updated catalog automatically.

## Changing Categories

Edit `gallery-sources.json` to add categories, rename groups, or change the filename keywords used to sort photos.
