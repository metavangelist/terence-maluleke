(function initAnalytics() {
  let measurementId = null;
  let gtagReady = false;
  let lastTrackedPath = "";
  const pendingViews = [];

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function sendArtworkView(section, title) {
    if (!measurementId) {
      return;
    }

    const slug = slugify(title);
    if (!slug) {
      return;
    }

    const path = `/artworks/${section}/${slug}`;
    if (path === lastTrackedPath) {
      return;
    }

    lastTrackedPath = path;
    const location = `${window.location.origin}${path}`;

    window.gtag("config", measurementId, {
      page_path: path,
      page_title: title,
      page_location: location,
    });

    window.gtag("event", "artwork_view", {
      page_path: path,
      page_title: title,
      page_location: location,
      artwork_section: section,
      artwork_slug: slug,
    });
  }

  function flushPendingViews() {
    if (!gtagReady || typeof window.gtag !== "function") {
      return;
    }

    while (pendingViews.length) {
      const view = pendingViews.shift();
      if (view) {
        sendArtworkView(view.section, view.title);
      }
    }
  }

  function loadGtag(id) {
    if (!id || measurementId === id) {
      flushPendingViews();
      return;
    }

    measurementId = id;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", id, {
      anonymize_ip: true,
      send_page_view: true,
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.addEventListener("load", () => {
      gtagReady = true;
      flushPendingViews();
    });
    document.head.appendChild(script);
  }

  async function initFromSanity() {
    const config = window.SANITY_CONFIG;
    if (!config?.projectId || !config?.dataset) {
      return;
    }

    const query = encodeURIComponent('*[_type == "siteSettings"][0]{ ga4MeasurementId }');
    const url =
      `https://${config.projectId}.api.sanity.io/v${config.apiVersion}/data/query/` +
      `${config.dataset}?query=${query}`;

    try {
      const response = await fetch(url);
      const payload = await response.json();
      const id = payload?.result?.ga4MeasurementId;

      if (id) {
        loadGtag(id);
      }
    } catch (_error) {
      // Analytics is optional; ignore fetch failures.
    }
  }

  window.trackArtworkView = function trackArtworkView(section, title) {
    if (!section || !title) {
      return;
    }

    if (!gtagReady || typeof window.gtag !== "function") {
      pendingViews.push({ section, title });
      initFromSanity();
      return;
    }

    sendArtworkView(section, title);
  };

  initFromSanity();
})();
