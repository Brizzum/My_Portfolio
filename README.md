# My_Portfolio

Personal portfolio with a **Concepts Gallery** of short interactive examples,
each paired with a summary of the theory and the references used.
Built with React + Vite; maps and charts use d3.

## Development

```bash
npm install
npm run dev      # local dev server at http://localhost:5173
npm test         # unit tests for the numerical code
npm run build    # production build into dist/
```

## Adding a concept

1. Create a folder under `src/concepts/<slug>/` with a React component.
2. Register it in `src/concepts/index.js` (slug, title, summary, component).
   It then appears in the gallery and at `/concepts/<slug>`.

## Deployment (Vercel)

Import the GitHub repository at https://vercel.com/new. Vercel detects Vite
(build command `npm run build`, output directory `dist`). `vercel.json`
rewrites all paths to `index.html` so that direct links such as
`/concepts/distributions` work. Every push to the production branch redeploys;
other branches get preview URLs.
