# Thomas de Chillaz — Animated CV

An immersive, scroll-led CV for Thomas de Chillaz. The experience moves through
single-cell research, astronomy, education, selected projects, and public impact
with animated scientific scenes while preserving a readable semantic document.

## Highlights

- DNA, planetary, and learning-network canvas chapters
- Motion pause control and reduced-motion support
- Keyboard-accessible navigation and visible focus states
- Responsive layouts for desktop, tablet, and mobile
- Server-rendered CV content and social-sharing metadata

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npx tsc --noEmit -p tsconfig.json
npm test
```

`npm test` creates a production build and verifies the rendered CV structure,
content, link safety, and reduced-motion fallback.

## Main files

- `app/PortfolioExperience.tsx` — scroll chapters and animated scenes
- `app/globals.css` — visual system, layouts, and motion fallbacks
- `app/page.tsx` — page metadata and route entry point
- `tests/rendered-html.test.mjs` — rendered-output checks

