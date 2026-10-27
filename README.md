# e2t — Tamil Writer

A free, privacy-first Tamil writing workspace. Type Tanglish (Romanized Tamil) or use a Tamil keyboard, then export your writing as **Word (.docx)**, **Text (.txt)**, or **PDF via the browser's print dialog**.

## Features

- Live English-to-Tamil phonetic input and direct Unicode Tamil typing.
- Native Tamil characters, without remote translation services or a backend.
- Document title, character and word counts, and adjustable editor font size.
- Word export using a small built-in Office Open XML ZIP writer (no runtime dependencies).
- UTF-8 text export and print-to-PDF with browser-native Tamil glyph shaping.
- Local autosave using `localStorage`, import `.txt` / `.md`, clipboard copy, and a confirmation before clearing.
- Responsive desktop/mobile interface; installable PWA with offline static asset caching.
- 100% client-side: documents are never sent to a server.

## Run locally

```bash
npm start
```

Open http://localhost:4173. Node.js and Python 3 are sufficient, and `npm install` is **not** required.

## Test

```bash
npm test
```

Unit tests cover phonetic conversion, Unicode/XML escaping, generated DOCX structure, and download file names. GitHub Actions runs them on every push and pull request.

## Static hosting

Deploy the repository directly to GitHub Pages, Netlify, Cloudflare Pages or Vercel as static files. There is no build step. On GitHub Pages, set the publishing source to **Deploy from a branch** → `main` → `/ (root)`.

## How PDF downloads work

Click **Save as PDF** to open the browser's print dialog, and select **Save as PDF** as the destination. This renders Tamil with the user's browser/system fonts; PDF export is not performed by a cloud API.

## Keyboard examples

| Input | Output |
|---|---|
| `vanakkam` | வணக்கம் |
| `nandri` | நன்றி |
| `tamizh` | தமிழ் |
| `amma` | அம்மா |
| `zh` | ழ் |
| `th` | த் |
| `N` | ண் |

The phonetic mode uses a lightweight deterministic transliteration table with a short set of common-word overrides. It is **not** a full natural-language suggestion engine. For exact spellings, users can switch to their device's Tamil keyboard in **Direct typing** mode.

## Privacy

Drafts are stored locally on the device. DOCX/TXT bytes are generated in the browser, and the print dialog handles PDF output. The application contains no analytics, remote API requests, or third-party JavaScript dependencies.

## License

MIT — see [LICENSE](LICENSE).
