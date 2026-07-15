(function () {
  const ROOT_ID = "ssus-root";

  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const FALLBACK_STORE_TYPES = [
    { type: "dev", label: "Dev" },
    { type: "client_transfer", label: "Client transfer" },
    { type: "collaborations", label: "Collaborations" },
  ];

  const BADGE_CLASS = {
    dev: "ssus-badge-dev",
    client_transfer: "ssus-badge-client_transfer",
    collaborations: "ssus-badge-collaborations",
  };

  let debounceTimer = null;
  let searchGeneration = 0;

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.innerHTML = `
    <div class="ssus-header">
      <span class="ssus-title">Search all stores</span>
      <span class="ssus-kbd-hint"><kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd></span>
    </div>
    <div class="ssus-search-row">
      <input
        class="ssus-search-input"
        type="search"
        placeholder="Search Dev, Client transfer, Collaborations…"
        autocomplete="off"
        spellcheck="false"
        aria-label="Search all stores"
      />
      <button type="button" class="ssus-clear-btn" aria-label="Clear search">Clear</button>
    </div>
    <div class="ssus-status" hidden></div>
    <div class="ssus-errors"></div>
    <div class="ssus-results" role="listbox" aria-label="Store search results"></div>
    <div class="ssus-empty" hidden>Type to search across all store tabs</div>
  `;

  document.documentElement.appendChild(root);

  const searchInput = root.querySelector(".ssus-search-input");
  const clearBtn = root.querySelector(".ssus-clear-btn");
  const statusEl = root.querySelector(".ssus-status");
  const errorsEl = root.querySelector(".ssus-errors");
  const resultsEl = root.querySelector(".ssus-results");
  const emptyEl = root.querySelector(".ssus-empty");

  function getOrgId() {
    const match = window.location.pathname.match(/\/dashboard\/(\d+)\/stores/);
    return match ? match[1] : null;
  }

  function discoverStoreTypes() {
    const tabs = document.querySelectorAll('form a[role="tab"][href*="store_type="]');
    const types = [];

    for (const tab of tabs) {
      const href = tab.getAttribute("href") || "";
      const match = href.match(/store_type=([^&]+)/);
      if (!match) {
        continue;
      }

      const type = decodeURIComponent(match[1]);
      const label = tab.textContent.trim() || type;
      if (!types.some((entry) => entry.type === type)) {
        types.push({ type, label });
      }
    }

    return types.length > 0 ? types : FALLBACK_STORE_TYPES;
  }

  function buildSearchUrl(orgId, storeType, query) {
    const params = new URLSearchParams({
      store_type: storeType,
      search_term: query,
    });
    return `https://dev.shopify.com/dashboard/${orgId}/stores?${params.toString()}`;
  }

  async function fetchStoresForType(orgId, storeType, label, query) {
    const url = buildSearchUrl(orgId, storeType, query);
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "text/html, application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`${label}: HTTP ${response.status}`);
    }

    const html = await response.text();
    return parseStoresFromHtml(html, storeType, label);
  }

  function parseStoresFromHtml(html, storeType, label) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("#stores-table") || doc.querySelector('[id="stores-table"]');
    if (!table) {
      return [];
    }

    const results = [];

    for (const row of table.querySelectorAll("tbody tr")) {
      const link = row.querySelector("td a[href]");
      if (!link) {
        continue;
      }

      const name = link.textContent.trim();
      if (!name) {
        continue;
      }

      const rawHref = link.getAttribute("href");
      const href =
        rawHref.startsWith("http://") || rawHref.startsWith("https://")
          ? rawHref
          : new URL(rawHref, window.location.origin).href;
      const planCell = row.querySelector("td:nth-of-type(5)");
      const plan = planCell ? planCell.textContent.trim() : "";

      results.push({
        name,
        href,
        plan,
        storeType,
        label,
      });
    }

    return results;
  }

  function dedupeResults(results) {
    const byHref = new Map();

    for (const result of results) {
      const existing = byHref.get(result.href);
      if (!existing) {
        byHref.set(result.href, {
          ...result,
          labels: [result.label],
          storeTypes: [result.storeType],
        });
        continue;
      }

      if (!existing.storeTypes.includes(result.storeType)) {
        existing.storeTypes.push(result.storeType);
        existing.labels.push(result.label);
      }
    }

    return Array.from(byHref.values());
  }

  async function searchAll(query) {
    const orgId = getOrgId();
    if (!orgId) {
      return { results: [], errors: ["Could not detect organization ID from URL."] };
    }

    const storeTypes = discoverStoreTypes();
    const settled = await Promise.allSettled(
      storeTypes.map(({ type, label }) => fetchStoresForType(orgId, type, label, query))
    );

    const results = [];
    const errors = [];

    settled.forEach((outcome, index) => {
      const { label } = storeTypes[index];
      if (outcome.status === "fulfilled") {
        results.push(...outcome.value);
        return;
      }
      errors.push(outcome.reason?.message || `${label}: search failed`);
    });

    return { results: dedupeResults(results), errors };
  }

  function setStatus(message, isError) {
    if (!message) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      statusEl.classList.remove("ssus-status-error");
      return;
    }

    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.classList.toggle("ssus-status-error", Boolean(isError));
  }

  function renderErrors(errors) {
    errorsEl.textContent = errors.length > 0 ? errors.join(" · ") : "";
  }

  function renderResults(results) {
    resultsEl.textContent = "";

    for (const result of results) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ssus-result";
      button.setAttribute("role", "option");

      const top = document.createElement("div");
      top.className = "ssus-result-top";

      const name = document.createElement("span");
      name.className = "ssus-result-name";
      name.textContent = result.name;

      const badges = document.createElement("span");
      badges.style.display = "flex";
      badges.style.gap = "4px";
      badges.style.flexWrap = "wrap";
      badges.style.justifyContent = "flex-end";

      for (let i = 0; i < result.storeTypes.length; i += 1) {
        const storeType = result.storeTypes[i];
        const badge = document.createElement("span");
        badge.className = `ssus-badge ${BADGE_CLASS[storeType] || ""}`;
        badge.textContent = result.labels[i] || storeType;
        badges.appendChild(badge);
      }

      top.appendChild(name);
      top.appendChild(badges);
      button.appendChild(top);

      if (result.plan) {
        const meta = document.createElement("div");
        meta.className = "ssus-result-meta";
        meta.textContent = result.plan;
        button.appendChild(meta);
      }

      button.addEventListener("click", () => {
        window.open(result.href, "_blank", "noopener,noreferrer");
      });

      resultsEl.appendChild(button);
    }
  }

  function renderEmpty(query, resultCount) {
    if (!query.trim()) {
      emptyEl.hidden = false;
      emptyEl.textContent = "Type to search across all store tabs";
      return;
    }

    if (resultCount === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = "No matches in any tab";
      return;
    }

    emptyEl.hidden = true;
  }

  async function runSearch(query) {
    const trimmed = query.trim();
    const generation = ++searchGeneration;

    if (!trimmed) {
      setStatus("");
      renderErrors([]);
      renderResults([]);
      renderEmpty("", 0);
      return;
    }

    setStatus("Searching all tabs…");
    renderErrors([]);
    renderResults([]);
    emptyEl.hidden = true;

    const { results, errors } = await searchAll(trimmed);

    if (generation !== searchGeneration) {
      return;
    }

    renderResults(results);
    renderErrors(errors);
    renderEmpty(trimmed, results.length);

    if (results.length > 0) {
      setStatus(`${results.length} store${results.length === 1 ? "" : "s"} found`);
    } else if (errors.length > 0) {
      setStatus("Search failed for some tabs", true);
    } else {
      setStatus("No matches");
    }
  }

  function scheduleSearch(query) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runSearch(query);
    }, 300);
  }

  searchInput.addEventListener("input", () => {
    scheduleSearch(searchInput.value);
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchGeneration += 1;
    setStatus("");
    renderErrors([]);
    renderResults([]);
    renderEmpty("", 0);
    searchInput.focus();
  });

  document.addEventListener("keydown", (event) => {
    const isModK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
    if (!isModK) {
      return;
    }

    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  });

  renderEmpty("", 0);
})();
