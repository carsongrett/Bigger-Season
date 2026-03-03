# Favicon / Apple Touch Icon Quality

## Why it looked blurry on Apple

- **Apple Touch Icon** (home screen bookmark) is **180×180**. If that file was created by *upscaling* a 32×32 image, it looks soft/low-res on iPhone and iPad.
- **favicon.ico** built from only a 32×32 source also lacks a crisp 32px frame; some browsers scale it and it can look blurry.

## Fix: regenerate from the high-res source

The repo has a high-res source: **`logos/BS 500x500.png`**. All favicon assets should be *downscaled* from this, not upscaled from 32×32.

### One-time setup and run

```bash
npm install
npm run generate-favicons
```

This script:

- Reads `logos/BS 500x500.png`
- Writes crisp PNGs: `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180×180), `android-chrome-192x192.png`, `android-chrome-512x512.png`
- Builds `favicon.ico` with both 16×16 and 32×32 inside (so it stays sharp at different sizes)

After running, commit the updated files in `logos/` and redeploy. The Apple home screen icon should look sharp.
