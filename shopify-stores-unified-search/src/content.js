(function () {
  const ROOT_ID = "ssus-inline-root";
  const RESULTS_BODY_ID = "ssus-results-body";
  const HIDDEN_CLASS = "ssus-hidden-native";

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
  let lastQuery = "";
  let observer = null;
  let injecting = false;

  function getOrgId() {
    const match = window.location.pathname.match(/\/dashboard\/(\d+)\/stores/);
    return match ? match[1] : null;
  }

  function getStoresFrame() {
    return document.querySelector("#stores-table");
  }

  function getNativeHeader(frame) {
    return (
      frame.querySelector('div.py-2.w-full[data-controller="visibility"]') ||
      frame.querySelector('div[data-controller="visibility"]')
    );
  }

  function getNativeTableWrap(frame) {
    return frame.querySelector(".overflow-x-auto.w-full") || frame.querySelector(".overflow-x-auto");
  }

  function getNativeTbody(frame) {
    return frame.querySelector("table tbody");
  }

  function getNativePagination(frame) {
    return frame.querySelector(".flex.justify-start");
  }

  function discoverStoreTypes(frame) {
    const scope = frame || document;
    const tabs = scope.querySelectorAll('form a[role="tab"][href*="store_type="]');
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

  function cellText(row, index) {
    const cell = row.querySelector(`td:nth-of-type(${index})`);
    if (!cell) {
      return "";
    }
    return cell.textContent.replace(/\s+/g, " ").trim();
  }

  function parseStoresFromHtml(html, storeType, label) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("#stores-table") || doc;
    const results = [];

    for (const row of table.querySelectorAll("tbody tr")) {
      const link =
        row.querySelector('a[data-row-primary-link="true"]') ||
        row.querySelector("td a[href]");
      if (!link) {
        continue;
      }

      const name = link.textContent.trim();
      if (!name) {
        continue;
      }

      const rawHref = link.getAttribute("href") || "";
      const href =
        rawHref.startsWith("http://") || rawHref.startsWith("https://")
          ? rawHref
          : new URL(rawHref, window.location.origin).href;

      const domainEl = row.querySelector("p.text-body-minor");
      const iconEl = row.querySelector(".store-icon");

      results.push({
        name,
        href,
        domain: domainEl ? domainEl.textContent.trim() : "",
        iconText: iconEl ? iconEl.textContent.trim() : "",
        iconStyle: iconEl ? iconEl.getAttribute("style") || "" : "",
        status: cellText(row, 3),
        owner: cellText(row, 4),
        plan: cellText(row, 5),
        featurePreview: cellText(row, 6),
        created: (() => {
          const createdCell = row.querySelector("td:nth-of-type(7) span.flex-1");
          return createdCell ? createdCell.textContent.trim() : cellText(row, 7);
        })(),
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

  async function fetchStoresForType(orgId, storeType, label, query) {
    const response = await fetch(buildSearchUrl(orgId, storeType, query), {
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

  async function searchAll(query, storeTypes) {
    const orgId = getOrgId();
    if (!orgId) {
      return { results: [], errors: ["Could not detect organization ID from URL."] };
    }

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

  function createSearchUi() {
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.className = "ssus-inline";
    root.innerHTML = `
      <div class="ssus-inline__bar">
        <div class="ssus-inline__search" role="search">
          <svg class="ssus-inline__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12.1842 12.2394C11.3383 12.8812 10.2837 13.2625 9.14061 13.2625C6.35883 13.2625 4.10311 11.0068 4.10311 8.225C4.10311 5.44323 6.35883 3.1875 9.14061 3.1875C11.9224 3.1875 14.1781 5.44323 14.1781 8.225C14.1781 9.36808 13.7968 10.4227 13.155 11.2686L15.8089 13.9225C16.0773 14.1909 16.0773 14.6261 15.8089 14.8945C15.5405 15.1629 15.1053 15.1629 14.8369 14.8945L12.1842 12.2394ZM12.8031 8.225C12.8031 10.2475 11.1631 11.8875 9.14061 11.8875C7.11812 11.8875 5.47811 10.2475 5.47811 8.225C5.47811 6.20252 7.11812 4.5625 9.14061 4.5625C11.1631 4.5625 12.8031 6.20252 12.8031 8.225Z" fill="#D7D7DB"></path>
          </svg>
          <input
            class="ssus-inline__input"
            type="search"
            placeholder="Search all stores (Dev, Client transfer, Collaborations)"
            autocomplete="off"
            spellcheck="false"
            aria-label="Search all stores"
          />
        </div>
        <button type="button" class="ssus-inline__clear" hidden>Clear</button>
      </div>
      <div class="ssus-inline__meta">
        <span class="ssus-inline__status">Unified search across all store types</span>
        <span class="ssus-inline__hint"><kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd></span>
      </div>
      <div class="ssus-inline__errors" hidden></div>
    `;
    return root;
  }

  function setStatus(root, message, isError) {
    const statusEl = root.querySelector(".ssus-inline__status");
    statusEl.textContent = message;
    statusEl.classList.toggle("ssus-inline__status--error", Boolean(isError));
  }

  function setErrors(root, errors) {
    const errorsEl = root.querySelector(".ssus-inline__errors");
    if (!errors.length) {
      errorsEl.hidden = true;
      errorsEl.textContent = "";
      return;
    }
    errorsEl.hidden = false;
    errorsEl.textContent = errors.join(" · ");
  }

  function hideNativeChrome(frame) {
    const header = getNativeHeader(frame);
    const pagination = getNativePagination(frame);
    if (header) {
      header.classList.add(HIDDEN_CLASS);
    }
    if (pagination) {
      pagination.classList.add(HIDDEN_CLASS);
    }
  }

  function restoreNativeTable(frame) {
    const existing = document.getElementById(RESULTS_BODY_ID);
    if (existing) {
      existing.remove();
    }

    const tbody = getNativeTbody(frame);
    if (tbody) {
      tbody.classList.remove(HIDDEN_CLASS);
    }

    const pagination = getNativePagination(frame);
    if (pagination) {
      pagination.classList.remove(HIDDEN_CLASS);
    }
  }

  function ensureTypeHeader(frame) {
    const typeTh = frame.querySelector("table thead th:nth-of-type(2)");
    if (typeTh && !typeTh.dataset.ssusReady) {
      typeTh.dataset.ssusReady = "1";
      typeTh.textContent = "Type";
    }
  }

  function renderResultsTable(frame, results) {
    const nativeTbody = getNativeTbody(frame);
    const table = frame.querySelector("table");
    if (!nativeTbody || !table) {
      return;
    }

    ensureTypeHeader(frame);
    nativeTbody.classList.add(HIDDEN_CLASS);

    let resultsBody = document.getElementById(RESULTS_BODY_ID);
    if (!resultsBody) {
      resultsBody = document.createElement("tbody");
      resultsBody.id = RESULTS_BODY_ID;
      nativeTbody.insertAdjacentElement("afterend", resultsBody);
    }

    resultsBody.textContent = "";

    if (results.length === 0) {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 7;
      emptyCell.className = "ssus-empty-cell";
      emptyCell.textContent = "No matches in any tab";
      emptyRow.appendChild(emptyCell);
      resultsBody.appendChild(emptyRow);
      return;
    }

    for (const result of results) {
      const tr = document.createElement("tr");
      tr.className = "group cursor-pointer ssus-result-row";

      const storeTd = document.createElement("td");
      const storeWrap = document.createElement("div");
      storeWrap.className = "flex items-center gap-3";

      if (result.iconText) {
        const icon = document.createElement("div");
        icon.className = "store-icon flex-shrink-0 flex items-center justify-center";
        icon.style.cssText =
          result.iconStyle ||
          "width: 32px; height: 32px; border-radius: 8px; background-color: #3D494B; color: #D7D7DB; font-size: 10px; font-weight: 400;";
        icon.textContent = result.iconText;
        storeWrap.appendChild(icon);
      }

      const textWrap = document.createElement("div");
      const nameLink = document.createElement("a");
      nameLink.href = result.href;
      nameLink.target = "_blank";
      nameLink.rel = "noopener noreferrer";
      nameLink.className = "hover:underline ssus-store-link";
      nameLink.style.color = "inherit";
      nameLink.textContent = result.name;
      textWrap.appendChild(nameLink);

      if (result.domain) {
        const domain = document.createElement("p");
        domain.className = "text-body-minor text-text-subdued font-normal";
        domain.textContent = result.domain;
        textWrap.appendChild(domain);
      }

      storeWrap.appendChild(textWrap);
      storeTd.appendChild(storeWrap);
      tr.appendChild(storeTd);

      const typeTd = document.createElement("td");
      const badges = document.createElement("div");
      badges.className = "ssus-type-badges";
      for (let i = 0; i < result.storeTypes.length; i += 1) {
        const storeType = result.storeTypes[i];
        const badge = document.createElement("span");
        badge.className = `ssus-badge ${BADGE_CLASS[storeType] || ""}`;
        badge.textContent = result.labels[i] || storeType;
        badges.appendChild(badge);
      }
      typeTd.appendChild(badges);
      tr.appendChild(typeTd);

      for (const value of [
        result.status || "—",
        result.owner || "—",
        result.plan || "—",
        result.featurePreview || "—",
        result.created || "—",
      ]) {
        const td = document.createElement("td");
        td.className = "text-text-subdued";
        td.textContent = value;
        tr.appendChild(td);
      }

      tr.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
          return;
        }
        window.open(result.href, "_blank", "noopener,noreferrer");
      });

      resultsBody.appendChild(tr);
    }

    const pagination = getNativePagination(frame);
    if (pagination) {
      pagination.classList.add(HIDDEN_CLASS);
    }
  }

  function wireUi(root, frame) {
    const input = root.querySelector(".ssus-inline__input");
    const clearBtn = root.querySelector(".ssus-inline__clear");
    const storeTypes = discoverStoreTypes(frame);

    async function runSearch(query) {
      const trimmed = query.trim();
      lastQuery = trimmed;
      const generation = ++searchGeneration;
      clearBtn.hidden = !trimmed;

      if (!trimmed) {
        restoreNativeTable(frame);
        setStatus(root, "Unified search across all store types");
        setErrors(root, []);
        return;
      }

      setStatus(root, "Searching all tabs…");
      setErrors(root, []);

      const { results, errors } = await searchAll(trimmed, storeTypes);
      if (generation !== searchGeneration) {
        return;
      }

      renderResultsTable(frame, results);
      setErrors(root, errors);

      if (results.length > 0) {
        setStatus(
          root,
          `${results.length} store${results.length === 1 ? "" : "s"} across all types`
        );
      } else if (errors.length > 0) {
        setStatus(root, "Search failed for some tabs", true);
      } else {
        setStatus(root, "No matches in any tab");
      }
    }

    function scheduleSearch(query) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runSearch(query);
      }, 300);
    }

    input.addEventListener("input", () => {
      scheduleSearch(input.value);
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      searchGeneration += 1;
      lastQuery = "";
      clearBtn.hidden = true;
      restoreNativeTable(frame);
      setStatus(root, "Unified search across all store types");
      setErrors(root, []);
      input.focus();
    });

    if (!document.documentElement.dataset.ssusHotkeyBound) {
      document.documentElement.dataset.ssusHotkeyBound = "1";
      document.addEventListener("keydown", (event) => {
        const isModK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
        if (!isModK) {
          return;
        }
        const currentInput = document.querySelector(`#${ROOT_ID} .ssus-inline__input`);
        if (!currentInput) {
          return;
        }
        event.preventDefault();
        currentInput.focus();
        currentInput.select();
      });
    }

    if (lastQuery) {
      input.value = lastQuery;
      clearBtn.hidden = false;
      runSearch(lastQuery);
    }
  }

  function mount() {
    if (injecting) {
      return;
    }

    const frame = getStoresFrame();
    if (!frame) {
      return;
    }

    const nativeHeader = getNativeHeader(frame);
    if (!nativeHeader) {
      return;
    }

    if (document.getElementById(ROOT_ID)) {
      return;
    }

    injecting = true;
    try {
      hideNativeChrome(frame);
      const root = createSearchUi();
      nativeHeader.insertAdjacentElement("afterend", root);
      wireUi(root, frame);
    } finally {
      injecting = false;
    }
  }

  function observe() {
    if (observer) {
      return;
    }

    observer = new MutationObserver(() => {
      if (!document.getElementById(ROOT_ID)) {
        mount();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  mount();
  observe();

  document.addEventListener("turbo:load", mount);
  document.addEventListener("turbo:frame-load", mount);
  document.addEventListener("turbo:render", mount);
})();
