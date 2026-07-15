# Shopify Stores Unified Search

Chrome extension that adds a search overlay on the Shopify Dev Dashboard **Stores** page. Search once across **Dev**, **Client transfer**, and **Collaborations** tabs and see merged results with type badges.

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `shopify-stores-unified-search`

## Usage

1. Go to `https://dev.shopify.com/dashboard/{orgId}/stores`
2. Use the **Search all stores** panel in the top-right
3. Type a store name — results from all tabs appear together
4. Click a result to open the store in a new tab

**Keyboard shortcut:** `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) focuses the search box.

## How it works

The extension reads store-type tabs from the page, then fetches each tab’s search URL in parallel using your existing login session:

```
/dashboard/{orgId}/stores?store_type={type}&search_term={query}
```

Results are parsed from `#stores-table` and shown with a badge for the source tab.
