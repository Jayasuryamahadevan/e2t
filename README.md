# e2t — Tanglish to Tamil Writer

A focused, free Tamil writing tool that runs entirely in the browser, hosted on GitHub Pages.

**Live website:** https://jayasuryamahadevan.github.io/e2t/

## How it works

1. Type a full word in English letters, such as `vanakkam`.
2. While typing, it **remains in English**.
3. Press **Space**: the word becomes **வணக்கம் **, with the cursor after the space.
4. Continue typing. Each new word converts only when you press Space.

This is **Tanglish transliteration**, not English-language translation. The application includes offline spelling rules and common-word mappings; because romanized Tamil is ambiguous, some words may still need manual correction.

## Features

- Space-to-convert Tanglish typing in an editable document.
- Native Tamil text is preserved; normal backspace, cursor movement, and clipboard editing work.
- Punctuation, URLs, mixed-script strings, and pastes are protected from accidental conversion.
- Local draft autosave, word/character counts, adjustable font size, and example words.
- Export as Word (`.docx`) or UTF-8 text (`.txt`) entirely in the browser.
- Print / Save as PDF using the browser's print dialog.
- Import `.txt` / `.md` files and convert existing Tanglish text manually.
- Responsive, installable offline-friendly static website.

**No external typing widgets, Google Translate, translation API, API key, backend, or serverless processing service is used.**

## Develop

```sh
npm test
npm start
```

Visit http://localhost:4173. No runtime dependencies or build step are required. The Node test runner executes UI simulation, transliteration, Word export, and single-tool checks.

## Deploy

The repository includes a GitHub Pages workflow in `.github/workflows/deploy.yml`. In repository settings, choose **Pages → Build and deployment → GitHub Actions**. Every push to `main` deploys the static files.

## Privacy

The editor stores drafts in browser local storage. File generation happens locally. The app makes no cross-origin translation calls. Opening the site requires downloading the static app initially; the service worker caches the app for offline visits.

## License

MIT.
