# Shopify Stores Search

Chrome extension for the Shopify Dev Dashboard **Stores** page.

Search **Dev**, **Client transfer**, and **Collaborations** stores in one place.

## Clone and install in Chrome

Anyone can install it like this:

### 1. Get the code

```bash
git clone https://github.com/refael-wedev/Shopify-Stores-Search.git
cd Shopify-Stores-Search
```

Or download the ZIP from GitHub → **Code** → **Download ZIP**, then unzip it.

### 2. Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder (important — select the inner folder, not the repo root):

```
Shopify-Stores-Search/shopify-stores-unified-search
```

5. Open the Dev Dashboard Stores page while logged into Shopify:

```
https://dev.shopify.com/dashboard/{orgId}/stores
```

You should see the unified search box at the top of the stores table.

### 3. After pulling updates

```bash
cd Shopify-Stores-Search
git pull
```

Then on `chrome://extensions`, click the **reload** icon on **Shopify Stores Search**, and hard-refresh the Stores page.

## More docs

Full usage details: [shopify-stores-unified-search/README.md](shopify-stores-unified-search/README.md)
