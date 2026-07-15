# Shopify Stores Unified Search

Chrome extension that replaces the native Dev / Client transfer / Collaborations tabs on the Shopify Dev Dashboard **Stores** page with one unified search across all store types.

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `shopify-stores-unified-search`

## Usage

1. Go to `https://dev.shopify.com/dashboard/{orgId}/stores`
2. The old tabs are replaced by a single search box in that same header area
3. Type a store name — results from all tabs appear in the main table
4. The **Type** column shows badges: Dev / Client transfer / Collaborations
5. Click a result to open the store in a new tab

**Keyboard shortcut:** `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) focuses the search box.

**Clear** restores the current page’s native store list for the active URL tab.

## How it works

The extension hides the native tab strip and injects a search bar in its place. On search it fetches each tab’s URL in parallel using your login session:

```
/dashboard/{orgId}/stores?store_type={type}&search_term={query}
```

Results are parsed from `#stores-table` and rendered into the main table with type badges.
