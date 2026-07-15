# Shopify Stores Unified Search

Chrome extension for the Shopify Dev Dashboard **Stores** page. Adds a mode switcher so you can use either:

- **Unified search** — one search box across Dev, Client transfer, and Collaborations
- **Legacy** — the original Shopify tabs and search

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `shopify-stores-unified-search`

## Usage

1. Go to `https://dev.shopify.com/dashboard/{orgId}/stores`
2. Use the **Unified search / Legacy** switcher at the top of the stores table
3. In Unified mode, type a store name — results from all tabs appear in the main table
4. The **Type** column shows badges: Dev / Client transfer / Collaborations
5. Click a result to open the store in a new tab

Your chosen mode is remembered for next visits.

## How it works

In Unified mode, the extension hides the native tab strip and searches each tab URL in parallel using your login session:

```
/dashboard/{orgId}/stores?store_type={type}&search_term={query}
```

Results are parsed from `#stores-table` and rendered into the main table with type badges.

In Legacy mode, the original Dev Dashboard UI is shown unchanged.
