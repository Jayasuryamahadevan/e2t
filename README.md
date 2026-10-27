# e2t — Tamil Writer and In-Page Translation

A lightweight Tamil editor with phonetic Tanglish typing, auto-saved drafts and downloads in **DOCX**, **TXT** and **PDF** (using the browser's print dialog). The writer is entirely client-side. Translation is performed inside the e2t interface via a separately deployed serverless API backed by the **official Google Cloud APIs**, not the consumer Google Translate website.

## Features

- Tamil phonetic typing and direct Tamil keyboard input.
- Local draft autosave, character and word counts, text import, clipboard controls.
- Browser-side DOCX/TXT export and native print-to-PDF; no server processing of writer documents.
- Translation workspace on `#google` that displays requests, translated results, detected source language and editable output **without opening Google Translate**.
- English, Tamil, Hindi, Malayalam, and Telugu language selection; auto-detect source.
- Text translation through **Google Cloud Translation — Basic v2**.
- Image OCR (`.png`, `.jpg`, `.webp`, under 2 MB) through **Google Cloud Vision** followed by translation. This translates extracted text; it does not redraw or reconstruct the original image.
- Document text extraction for `.txt`, `.md`, `.docx` and text-based `.pdf` (under 8 MB, up to 10,000 characters); document text is translated and appears in the app, but layout and formatting are not preserved. Scanned PDFs are not supported by document mode.
- Copy the translated result or add it to the Tamil Writer for DOCX/TXT/PDF export.
- Explicit configuration/status indicators, cancellation, input validation, CORS and per-client rate limiting on the API, and accessible UI status messages.
- Optional Desh Keyboard and Easy Tamil Typing companion sites on `#desh` and `#translate` (third-party iframe policy may block embedding).
- Works on GitHub Pages as a static site. **Only translation** needs the Worker and external Google services.

## Architecture

```text
Browser (GitHub Pages, static e2t site)
  |- Tamil writing, local drafts, DOCX/TXT/PDF export (no backend)
  |- Translate Text --POST JSON-------------------┐
  |- Translate Image --POST base64 PNG/JPG/WebP-->| Cloudflare Worker /translate
  |- Document: extract text locally --POST JSON--┘       |
                                                        +- Google Cloud Translation API v2
                                                        +- Google Cloud Vision API (image OCR)
                                <---- JSON with sourceText + translatedText + detectedSourceLanguage
```

The **public** `translate.google.co.in` webpage isn't an API. e2t does **not** POST to that webpage, scrape its output, navigate there, or embed it. Instead, the Worker makes authenticated requests to official Google Cloud APIs.

## Deploy the static website

The repository includes `.github/workflows/deploy.yml` for GitHub Pages. Enable **Settings → Pages → Source: GitHub Actions** once. The site lives at `https://jayasuryamahadevan.github.io/e2t/`.

The writing/export features run without any configuration. Translation displays **Not configured** until a Worker endpoint is published in `lib/translation-config.js`, or a trusted endpoint is entered in the UI.

## Set up Google-powered in-page translation

This is a one-time operation for the **site owner**. It requires a Google Cloud project with billing and a Cloudflare Workers account (plan limits and Google usage charges apply).

1. In Google Cloud Console, enable **Cloud Translation API** and **Cloud Vision API** on a billing-enabled project. Create a Google Cloud API key and **restrict it to those two APIs**. Store this key only as a Worker secret. A leaked key can create charges; configure Google Cloud billing budgets and quotas.
2. In the repository, open a terminal at the repo root. Install and authenticate to Wrangler, if needed: `npx wrangler login`. Then deploy the Worker: `npx wrangler deploy --config worker/wrangler.jsonc` (alternatively `cd worker` and use `npx wrangler deploy`). The account's rate-limiting binding must be supported by its Cloudflare plan.
3. Set the secret for the deployed Worker, using `npx wrangler secret put GOOGLE_API_KEY --config worker/wrangler.jsonc` and paste the key at the prompt. **Do not commit the key** or put it in the browser. Note that Wrangler can ask for the secret before deployment when required; deploy again after adding it if needed.
4. The Worker deployment returns a URL, for example `https://e2t-translate-api.YOURNAME.workers.dev`. Set `DEFAULT_TRANSLATION_API_URL` in `lib/translation-config.js` to the public `https://e2t-translate-api.YOURNAME.workers.dev/translate` URL and commit it. GitHub Pages will deploy this publicly accessible URL for **all visitors**. Visitors can override the URL using the endpoint field in the UI if needed; they should not need to configure it individually.
5. Type some text and click **Translate text →**. e2t sends a POST request to your Worker, which responds with a translated string. The browser displays the text in the result pane. No Google Translate website opens.

The Worker allows requests from `https://jayasuryamahadevan.github.io` by default. If you deploy the frontend on another origin, change `worker/wrangler.jsonc` → `ALLOWED_ORIGIN` (use the exact **origin**, without `/e2t` or trailing slash), redeploy, and configure a matching endpoint in the UI.

### Security and operational considerations

- The Google API key is read only by the Worker from `env.GOOGLE_API_KEY`; it is never returned to visitors. The Worker uses `POST /translate` and its response includes no cacheable user data.
- The Worker uses an origin allowlist and a Cloudflare rate-limit binding (10 requests/min per client IP, approximated per edge location). **CORS and Origin validation are not authentication:** non-browser clients can spoof the Origin header. Apply strict project quotas, budget alerts, WAF rules and/or user authentication and Turnstile if the API is made public.
- Request limits: 10,000 text characters; images under 2 MB; documents under 8 MB containing at most 10,000 extractable characters. There is no arbitrary website scraping or server-side file storage.
- Images go to Google Cloud Vision; text and extracted document contents go to Google Cloud Translation. These are third-party paid services subject to Google's terms and data handling rules. Do not submit sensitive data without assessing those policies.
- Document extraction uses dynamically imported JSZip and PDF.js packages from the pinned jsDelivr CDN, so opening DOCX/PDF files requires internet access. TXT and Markdown files need no parsing dependency.
- `localStorage` saves the draft and configured Worker **URL**, not the Google key. The URL must be trusted because text is sent there when you click Translate. Avoid entering third-party endpoints you do not control.
- The API is not provisioned automatically from this repository. A GitHub Pages deployment alone does not turn on Google-powered translation.

## Request/response contract

For text, the browser POSTs JSON to your Worker:

```json
{"kind":"text","source":"en","target":"ta","text":"Hello"}
```

For images, it sends `{"kind":"image","source":"auto","target":"ta","imageBase64":"..."}`.

A successful response has the form:

```json
{"sourceText":"Hello","translatedText":"வணக்கம்","detectedSourceLanguage":"en"}
```

All errors are `{ "error": "Human-readable message" }` with an appropriate HTTP status.

## Local development and tests

```bash
npm test
npm start
```

Open `http://localhost:4173` to use the browser app. Since production CORS allows only the Pages origin, set the Worker `ALLOWED_ORIGIN` to `http://localhost:4173` for local end-to-end testing (remember to reset it before publishing); the unit tests mock Google calls and do not require a real Google key.

## Limitations

- This implementation handles text, text extracted from images, and text extracted from documents. It is **not** the full Google Translate website or Cloud Translation Advanced document-layout engine.
- Supported Google translation languages are limited to the five listed in the interface; add more supported language codes in the frontend and Worker allowlists if needed.
- `.docx` extraction reads text only; formatting is lost. PDF extraction works on selectable text, not scanned or image-only PDFs. OCR recognizes image text but doesn't overlay translated text on the picture.
- Google API calls may incur charges; API outages, quota limits or inaccurate language detection can affect results.

## License

MIT — see [LICENSE](LICENSE).
