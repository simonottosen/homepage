# simonottosen.dk

Personal homepage. Plain static HTML, CSS and JavaScript, with no build step.

- `index.html`: content, including the project cards (edit the text and links here)
- `styles.css`: layout and card styles
- `cards.js`: lays out the card fan and handles opening and closing cards
- `patterns.js`: the generative artwork drawn on each card

## Run locally

```bash
python3 -m http.server 8000
```

## Deploy (Cloudflare Pages)

1. Workers & Pages → Create → Pages → Connect to Git → pick this repo.
2. Framework preset: None. Build command: empty. Output directory: `/`.
3. Custom domains → add `simonottosen.dk` (and `www.simonottosen.dk`).

Every push to `main` redeploys.

## Logo

`logo.svg` (transparent) and `favicon.svg` (dark tile) are an SO monogram built from the
S and O outlines of [Newsreader](https://github.com/productiontype/Newsreader), the
site's title typeface (SIL Open Font License). The S overlaps the O with a small
knockout gap.
