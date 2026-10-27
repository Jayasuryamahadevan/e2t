# e2t — Tamil Writer

A free, privacy-first Tamil writing workspace. Type Tanglish (Romanized Tamil) or use a Tamil keyboard, then export your writing as **Word (.docx)**, **Text (.txt)**, or **PDF via the browser's print dialog**.

## Features

- Live English-to-Tamil phonetic input, batch Tanglish conversion, and direct Unicode Tamil typing.
- Native Tamil characters, without remote translation services or a backend.
- Document title, character and word counts, and adjustable editor font size.
- Word export using a small built-in Office Open XML ZIP writer (no runtime dependencies).
- UTF-8 text export and print-to-PDF with browser-native Tamil glyph shaping.
- Local autosave using `localStorage`, import `.txt` / `.md`, clipboard copy, and a confirmation before clearing.
- Responsive desktop/mobile interface; installable PWA with offline static asset caching.
- 100% client-side for the built-in writer: documents are never sent to our server. External translation happens on the provider's website when requested.
- Hash-based `#writer`, `#desh`, , `#translate`, and `#google` routes compatible with GitHub Pages. Optional external iframe views and prominent official-site fallback links.

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

Deploy the repository directly to GitHub Pages, Netlify, Cloudflare Pages, or Vercel as static files. There is no build step. A Pages deployment workflow is included. On GitHub, go to **Settings → Pages → Build and deployment → Source → GitHub Actions** to enable publishing (one-time setup). The live site will then be at `https://jayasuryamahadevan.github.io/e2t/` after a successful deployment. Alternatively you can choose **Deploy from a branch → main → / (root)** for GitHub-managed static publishing.

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

## External Tamil tools / routing

- **Tamil Writer (`#writer`)**: Native, on-device Tamil text editor, document export and draft autosave. No server or API needed.
- **Desh Tamil Keyboard (`#desh`)**: Opens `https://www.deshkeyboard.com/tamil-typing/` inside an optional iframe where allowed, with a guaranteed link to the official site. For phonetic typing and suggestions.
- **Easy Tamil Typing translation (`#translate`)**: Opens `https://www.easytamiltyping.com/english/to/tamil/translation` the same way. For translating the *meaning* of English phrases into Tamil, not transliterating phonetic Tanglish.
- **Google Translate (`#google`)**: Dedicated four-tab companion for **Text**, **Images**, **Documents** and **Websites**. Text can be loaded from the editor and safely prefilled in Google’s public text-translation interface using `sl=auto&tl=ta&op=translate&text=...`. The source/target selectors customize URLs. Oversized URLs are deliberately not prefilled or truncated: copy the text and paste it on Google instead. Other modes use `op=images`, `op=docs` and `op=websites`. For images and documents, open Google and upload directly there. Use **Paste result into writer** to copy translated text back and export DOCX/TXT/PDF with the existing writer.

### Important Google Translate integration limitations

The `translate.google.co.in` URL is the **public Google Translate web application, not a translation API**. GitHub Pages cannot authenticate to the paid Cloud Translation API securely, and cannot use browser JavaScript to read the result in a cross-origin Google tab or silently upload local files there. This integration uses explicit user-initiated official links, not scraping, an unofficial endpoint, or a falsely embedded translation engine. The browser sends text to Google **only if a user opens the prefilled link**. Image/document translation is performed on Google’s website; no uploads go through e2t. Google documents support `.docx`, `.pdf`, `.pptx`, `.xlsx` up to 10 MB (PDFs up to 300 pages); document mode may be unavailable on mobile, and scanned text is not translated. Google’s own limits, terms and availability apply.

Use **Copy my document text** to move writing to the external service and **Paste clipboard into document** to add its result to the writer. Browsers prohibit reading or controlling cross-origin iframe content, and providers may prohibit embedding; there is deliberately no undocumented API scraping or iframe bypass. External services require connectivity, are not affiliated with e2t, and have their own terms and privacy policies. Opening those views shares your browser connection with the external provider, but your draft is never automatically uploaded to them.

## Privacy

Drafts are stored locally on the device. DOCX/TXT bytes are generated in the browser, and the print dialog handles PDF output. The native editor contains no analytics, remote API requests, or third-party JavaScript dependencies. Selecting an external tool loads that provider, which may set cookies or collect data under its own privacy terms.

## License

MIT — see [LICENSE](LICENSE).
