# Contributing to piilite

Thanks for helping make piilite better. The most useful contributions are **examples it gets wrong**.

## Never share real personal data

Use made-up values in issues, tests and pull requests: invented names, `@mail.test` emails, numbers that are not
anyone's. For Aadhaar, GSTIN or card numbers, generate checksum-valid fakes with the exported helpers:

```js
import { verhoeffDigit, gstinChecksum } from "piilite";
const fakeAadhaar = "49183726501" + verhoeffDigit("49183726501");
```

## Reporting a miss or a false alarm

Open an issue with the template. Include the sentence (with fake data), what you expected, and what piilite returned.
Confirmed cases become tests so they stay fixed.

## Development

Node.js 18 or later.

```bash
git clone https://github.com/aman5062/Piilite.git && cd Piilite
npm install
npm test          # all tests (node:test)
npm run eval:all  # accuracy on the evaluation sets
npm run build     # CommonJS builds in dist/
npm run site      # docs website in docs/
```

## Pull requests

- Add a test for every behaviour change; keep `npm test` green.
- Do not tune rules while looking at `eval/holdout2.json`. It is the untouched set whose score the README reports.
  If you need a new evaluation case, add it to `eval/dataset.json` via `eval/generate.js`.
- Keep the core free of runtime dependencies.
- Update `README.md`, the website (`site/pages.mjs`) and `CHANGELOG.md` when behaviour changes.
