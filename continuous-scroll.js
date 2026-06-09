(function () {
  if (window.__siteContinuity) return;
  window.__siteContinuity = true;

  const TOUR_PAGES = new Set([
    "index.html",
    "info.html",
    "gallery.html",
    "shows.html",
    "archives.html",
    "study.html",
  ]);

  let navigating = false;

  function pageFileFromPath(pathname) {
    const path = pathname.replace(/\/$/, "") || "/";
    if (path === "/" || path === "/index" || path.endsWith("/index.html")) return "index.html";
    const last = path.split("/").pop() || "";
    if (!last) return "index.html";
    return last.endsWith(".html") ? last : `${last}.html`;
  }

  function isTourHref(href) {
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      return TOUR_PAGES.has(pageFileFromPath(url.pathname));
    } catch {
      return false;
    }
  }

  function persistHeadNodes() {
    return [...document.head.querySelectorAll("[data-continuity='persist']")];
  }

  function syncHead(fromDoc) {
    const persist = persistHeadNodes();
    const persistSet = new Set(persist);

    [...document.head.children].forEach((node) => {
      if (!persistSet.has(node)) node.remove();
    });

    [...fromDoc.head.children].forEach((node) => {
      if (node.matches("[data-continuity='persist']")) return;

      const href = node.getAttribute("href");
      const src = node.getAttribute("src");
      if (href && [...document.head.querySelectorAll("link[href]")].some((el) => el.getAttribute("href") === href)) {
        return;
      }
      if (src && [...document.head.querySelectorAll("script[src]")].some((el) => el.getAttribute("src") === src)) {
        return;
      }

      document.head.appendChild(node.cloneNode(true));
    });
  }

  function runBodyScripts(fromDoc) {
    document.body.querySelectorAll("script").forEach((node) => node.remove());

    fromDoc.body.querySelectorAll("script").forEach((source) => {
      const script = document.createElement("script");
      [...source.attributes].forEach((attr) => script.setAttribute(attr.name, attr.value));
      if (source.src) {
        script.src = source.src;
      } else {
        script.textContent = source.textContent;
      }
      document.body.appendChild(script);
    });
  }

  function applyDocument(fromDoc) {
    const nextHtml = fromDoc.documentElement;
    const html = document.documentElement;

    html.className = nextHtml.className;
    html.lang = nextHtml.lang || html.lang;

    [...nextHtml.attributes].forEach((attr) => {
      if (attr.name === "class" || attr.name === "lang") return;
      html.setAttribute(attr.name, attr.value);
    });

    syncHead(fromDoc);
    document.body.className = fromDoc.body.className;
    document.body.innerHTML = fromDoc.body.innerHTML;
    runBodyScripts(fromDoc);
  }

  async function navigate(href, { replace = false } = {}) {
    if (navigating) return;

    const url = new URL(href, window.location.href);
    if (!TOUR_PAGES.has(pageFileFromPath(url.pathname))) {
      window.location.assign(url.href);
      return;
    }

    if (
      pageFileFromPath(url.pathname) === pageFileFromPath(window.location.pathname) &&
      url.pathname === window.location.pathname
    ) {
      return;
    }

    navigating = true;
    document.documentElement.classList.add("continuity-pending");

    try {
      const response = await fetch(url.href, {
        credentials: "same-origin",
        headers: { Accept: "text/html" },
      });

      if (!response.ok) {
        window.location.assign(url.href);
        return;
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const swap = () => {
        applyDocument(doc);
        document.title = doc.title;
        if (replace) {
          history.replaceState({ continuity: true }, "", url.pathname + url.search + url.hash);
        } else {
          history.pushState({ continuity: true }, "", url.pathname + url.search + url.hash);
        }
        window.scrollTo(0, 0);
      };

      if (document.startViewTransition) {
        await document.startViewTransition(swap).finished;
      } else {
        swap();
      }
    } catch {
      window.location.assign(url.href);
    } finally {
      document.documentElement.classList.remove("continuity-pending");
      navigating = false;
    }
  }

  document.documentElement.classList.add("continuity-active");

  if (!history.state || !history.state.continuity) {
    history.replaceState({ continuity: true }, "", window.location.href);
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    if (!isTourHref(link.getAttribute("href"))) return;

    event.preventDefault();
    navigate(link.href);
  });

  window.addEventListener("popstate", () => {
    navigate(window.location.href, { replace: true });
  });
})();
