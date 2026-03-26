# URL & Title Copier

A lightweight Chromium extension that copies the current page title and URL to your clipboard in multiple formats with rich-text support so messaging apps like Slack, Teams, and Gmail paste a real clickable hyperlink instead of raw text.

**100% local. No network calls. No data collection.**

---

## Features

- **Rich-text paste** — all formats write an HTML anchor (`<a>`) to the clipboard alongside the plain-text fallback, so pasting into Slack/Teams/Gmail/Notion renders a clickable linked title automatically
- **Three copy formats** with customisable templates:
  - **Plain** — `Page Title — https://example.com`
  - **Markdown** — `[Page Title](https://example.com)`
  - **HTML** — `<a href="https://example.com">Page Title</a>`
- **Toolbar popup** — click the extension icon to see the title & URL and copy in one click
- **Keyboard shortcuts** — copy without opening the popup
- **Settings page** — edit the plain-text templates and view/change shortcuts
- **Light & dark mode** support

---

## Keyboard Shortcuts

| Action | Mac | Windows / Linux |
|---|---|---|
| Copy as Plain Text | `Ctrl+Shift+C` | `Alt+Shift+C` |
| Copy as Markdown | `Ctrl+Shift+M` | `Alt+Shift+M` |
| Copy as HTML | `Ctrl+Shift+H` | `Alt+Shift+H` |

> Shortcuts can be remapped at `chrome://extensions/shortcuts`.

---

## Installation (local / unpacked)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle, top-right)
4. Click **Load unpacked** and select the project folder
5. The extension icon appears in the toolbar — pin it for easy access

No build step or `npm install` required. All files are plain HTML / CSS / JS.

---

## File Structure

```
/
├── manifest.json     # MV3 manifest — permissions, commands, icons
├── background.js     # Service worker — keyboard shortcuts, clipboard writes
├── popup.html/js/css # Toolbar popup UI
├── options.html/js/css  # Settings page
├── content.js        # Minimal placeholder (no always-on injection)
└── icons/            # 16 × 16, 48 × 48, 128 × 128 PNG icons
```

---

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read the title & URL of the active tab on demand |
| `clipboardWrite` | Write to the system clipboard |
| `scripting` | Inject the clipboard-write function into the active tab (MV3 pattern) |
| `storage` | Persist custom templates via `chrome.storage.sync` |
| `host_permissions: <all_urls>` | Allow keyboard shortcuts to work on any page without a per-site access prompt |

All processing is local. The extension makes no external network requests.

---

## Customising Templates

Open the settings page via the ⚙️ icon in the popup (or `chrome://extensions` → *Details* → *Extension options*).

Each format has an editable template using two placeholders:

| Placeholder | Value |
|---|---|
| `{title}` | The page title |
| `{url}` | The full page URL |

Changes are saved to `chrome.storage.sync` and roam with your Chrome profile.
