# Shopify Stores Search

Chrome extension for the Shopify Dev Dashboard **Stores** page.

Search all store types in one place — **Dev**, **Client transfer**, and **Collaborations** — instead of switching tabs every time.

## Features

- **Unified search** — one search box across all store types
- **Type badges** — each result shows Dev / Client transfer / Collaborations
- **Native look** — search styled like the Dev Dashboard search field
- **Open in new tab** — clicking a store opens it in a new tab
- Uses your existing Shopify login (no API keys)

> Note: A Unified / Legacy switcher exists in the code but is commented out for this version. Only unified search is shown.

## Clone and install in Chrome

After cloning (or downloading) this repo, install it as an unpacked Chrome extension.

### 1. Clone or download

```bash
git clone https://github.com/refael-wedev/Shopify-Stores-Search.git
cd Shopify-Stores-Search
```

Or on GitHub: **Code** → **Download ZIP** → unzip.

### 2. Load unpacked in Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the cloned repo folder (`Shopify-Stores-Search`) — the one that contains `manifest.json`
5. Open your Stores page (logged into Shopify):

```
https://dev.shopify.com/dashboard/{orgId}/stores
```

### 3. After updates (`git pull`)

```bash
cd Shopify-Stores-Search
git pull
```

Then on `chrome://extensions`, click the **reload** icon on this extension, and hard-refresh the Stores page.

## Usage

1. At the top of the stores table you’ll see the unified search box
2. Type a store name (for example `preme` or `hol`)
3. Results from all tabs appear in the main table
4. The **Type** column shows which tab each store came from
5. Click a store to open it in a new tab
6. Use **Clear** to reset the search and show the current page list again

## How it works

The extension hides the native tab strip and runs the same search Shopify uses, once per store type, in parallel:

```
/dashboard/{orgId}/stores?store_type=dev&search_term={query}
/dashboard/{orgId}/stores?store_type=client_transfer&search_term={query}
/dashboard/{orgId}/stores?store_type=collaborations&search_term={query}
```

It parses `#stores-table` from each response, merges the results, and renders them into the main table with type badges.

## Project structure

```
Shopify-Stores-Search/
├── manifest.json          # Chrome extension config (MV3)
├── README.md
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── content.js         # Injects UI and search
    └── overlay.css        # Styles matched to Dev Dashboard
```

## Requirements

- Google Chrome (or another Chromium browser that supports Manifest V3)
- Access to `https://dev.shopify.com/dashboard/.../stores`
- You must already be logged into Shopify

## Notes

- Display name in Chrome: **Shopify Stores Search**
- Current version: see `manifest.json` (`version`)
- Org ID is read from the page URL — no hardcoding needed
- The extension only runs on Dev Dashboard Stores pages
- This is an unpacked / local extension (not published to the Chrome Web Store)
- Users install from source with **Load unpacked** (select the repo root)
