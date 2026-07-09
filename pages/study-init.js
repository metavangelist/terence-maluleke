(function () {
  const CROSS_SECTIONS = [
    {
      sectionId: "section-study",
      videoId: "studyVideo",
      playKey: "playStudyVideo",
      pauseKey: "pauseStudyVideo",
      slugs: ["study", "spotify"],
    },
  ];

  let userInteracted = false;

  function bindCrossSection({ sectionId, videoId, playKey, pauseKey, slugs }) {
    const section = document.getElementById(sectionId);
    const video = document.getElementById(videoId);
    if (!section || !video) return;

    let videoReady = false;
    let playPending = false;

    function markVideoReady() {
      if (videoReady) return;
      videoReady = true;
      video.classList.add("is-ready");
      if (playPending) playVideo();
    }

    function playVideo() {
      playPending = true;
      video.muted = true;

      if (!videoReady && video.readyState < 2) {
        if (!video.currentSrc && !video.getAttribute("src")) video.load();
        return;
      }

      const attempt = video.play();
      if (attempt && typeof attempt.then === "function") {
        attempt.then(() => {
          playPending = false;
        }).catch(() => {});
      }
    }

    function pauseVideo() {
      playPending = false;
      video.pause();
    }

    function setVisible(visible) {
      if (visible) {
        section.classList.add("is-visible");
        playVideo();
      } else {
        section.classList.remove("is-visible");
        pauseVideo();
      }
    }

    function isInView() {
      const scrollRoot = document.getElementById("siteScroller");
      const rootRect = scrollRoot?.getBoundingClientRect();
      const rect = section.getBoundingClientRect();
      if (!rootRect) return rect.top < window.innerHeight && rect.bottom > 0;
      return rect.top < rootRect.bottom && rect.bottom > rootRect.top;
    }

    video.addEventListener("loadeddata", () => {
      markVideoReady();
      if (section.classList.contains("is-visible")) playVideo();
    }, { passive: true });

    video.addEventListener("canplay", () => {
      markVideoReady();
      if (section.classList.contains("is-visible")) playVideo();
    }, { passive: true });

    video.addEventListener("canplaythrough", () => {
      markVideoReady();
      if (section.classList.contains("is-visible")) playVideo();
    }, { passive: true });

    video.addEventListener("error", () => {
      const sources = [...video.querySelectorAll("source")];
      const current = sources.find((source) => !source.dataset.failed);
      if (current) {
        current.dataset.failed = "true";
        video.load();
      }
    }, { passive: true });

    video.addEventListener("ended", () => {
      if (section.classList.contains("is-visible")) {
        video.currentTime = 0;
        playVideo();
      }
    }, { passive: true });

    video.addEventListener("pause", () => {
      if (section.classList.contains("is-visible") && !document.hidden) {
        playVideo();
      }
    }, { passive: true });

    if ("IntersectionObserver" in window) {
      const scrollRoot = document.getElementById("siteScroller");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.08) {
              setVisible(true);
            } else if (!entry.isIntersecting || entry.intersectionRatio < 0.08) {
              setVisible(false);
            }
          });
        },
        { root: scrollRoot || null, threshold: [0, 0.08, 0.35, 0.6] }
      );
      observer.observe(section);
    }

    window[playKey] = () => setVisible(true);
    window[pauseKey] = () => setVisible(false);

    if (isInView()) setVisible(true);

    window.setTimeout(() => {
      if (section.classList.contains("is-visible")) playVideo();
    }, 500);

    const slug = window.location.hash.replace(/^#/, "").toLowerCase();
    if (slugs.includes(slug)) {
      window.setTimeout(() => setVisible(true), 120);
    }

    return { playVideo, section };
  }

  function bindGalleryClusterBackground() {
    const shell = document.getElementById("galleryClusterBg");
    const video = document.getElementById("galleryClusterVideo");
    const scroller = document.getElementById("siteScroller");
    if (!shell || !video) return;

    const CLUSTER_SECTION_IDS = ["section-gallery", "section-prints", "section-maquettes"];
    const intersecting = new Set();

    let videoReady = false;
    let playPending = false;
    let clusterVisible = false;

    function markVideoReady() {
      if (videoReady) return;
      videoReady = true;
      video.classList.add("is-ready");
      if (playPending) playVideo();
    }

    function playVideo() {
      playPending = true;
      video.muted = true;

      if (!videoReady && video.readyState < 2) {
        if (!video.currentSrc && !video.getAttribute("src")) video.load();
        return;
      }

      const attempt = video.play();
      if (attempt && typeof attempt.then === "function") {
        attempt.then(() => {
          playPending = false;
        }).catch(() => {});
      }
    }

    function pauseVideo() {
      playPending = false;
      video.pause();
    }

    function setClusterVisible(visible) {
      const next = Boolean(visible);
      if (next === clusterVisible) return;

      clusterVisible = next;
      shell.classList.toggle("is-visible", clusterVisible);
      shell.setAttribute("aria-hidden", clusterVisible ? "false" : "true");

      if (clusterVisible) playVideo();
      else pauseVideo();
    }

    function clusterSectionsInView() {
      if (!scroller) return intersecting.size > 0;

      const rootRect = scroller.getBoundingClientRect();
      return CLUSTER_SECTION_IDS.some((id) => {
        const section = document.getElementById(id);
        if (!section) return false;

        const rect = section.getBoundingClientRect();
        return rect.bottom > rootRect.top + 1 && rect.top < rootRect.bottom - 1;
      });
    }

    function syncClusterVisibility() {
      setClusterVisible(intersecting.size > 0 || clusterSectionsInView());
    }

    video.addEventListener("loadeddata", markVideoReady, { passive: true });
    video.addEventListener("canplay", markVideoReady, { passive: true });
    video.addEventListener("canplaythrough", markVideoReady, { passive: true });

    video.addEventListener("error", () => {
      const sources = [...video.querySelectorAll("source")];
      const current = sources.find((source) => !source.dataset.failed);
      if (current) {
        current.dataset.failed = "true";
        video.load();
      }
    }, { passive: true });

    video.addEventListener("ended", () => {
      if (clusterVisible) {
        video.currentTime = 0;
        playVideo();
      }
    }, { passive: true });

    video.addEventListener("pause", () => {
      if (clusterVisible && !document.hidden) {
        playVideo();
      }
    }, { passive: true });

    if (scroller && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) intersecting.add(entry.target.id);
            else intersecting.delete(entry.target.id);
          });
          syncClusterVisibility();
        },
        { root: scroller, threshold: [0, 0.01, 0.05, 0.12, 0.25] }
      );

      CLUSTER_SECTION_IDS.forEach((id) => {
        const section = document.getElementById(id);
        if (section) observer.observe(section);
      });
    }

    if (scroller) {
      scroller.addEventListener("scroll", () => {
        syncClusterVisibility();
      }, { passive: true });
    }

    window.playGalleryClusterVideo = syncClusterVisibility;
    window.pauseGalleryClusterVideo = syncClusterVisibility;

    video.load();
    syncClusterVisibility();
  }

  function onUserInteraction() {
    if (userInteracted) return;
    userInteracted = true;

    CROSS_SECTIONS.forEach(({ sectionId, playKey }) => {
      const section = document.getElementById(sectionId);
      if (section?.classList.contains("is-visible")) {
        window[playKey]?.();
      }
    });

    if (document.getElementById("galleryClusterBg")?.classList.contains("is-visible")) {
      window.playGalleryClusterVideo?.();
    }
  }

  CROSS_SECTIONS.forEach(bindCrossSection);
  bindGalleryClusterBackground();

  document.addEventListener("touchstart", onUserInteraction, { passive: true, once: true });
  document.addEventListener("click", onUserInteraction, { passive: true, once: true });
  document.addEventListener("scroll", onUserInteraction, { passive: true, once: true });

  document.addEventListener("visibilitychange", () => {
    CROSS_SECTIONS.forEach(({ sectionId, playKey, pauseKey }) => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      if (document.hidden) window[pauseKey]?.();
      else if (section.classList.contains("is-visible")) window[playKey]?.();
    });

    if (document.hidden) window.pauseGalleryClusterVideo?.();
    else if (document.getElementById("galleryClusterBg")?.classList.contains("is-visible")) {
      window.playGalleryClusterVideo?.();
    }
  }, { passive: true });

  initStudyGallery();
})();

function studySizedImageUrl(url, width) {
  if (!url || !String(url).includes("cdn.sanity.io/")) return url;
  const base = String(url).split("?")[0];
  const lower = base.toLowerCase();
  if (lower.endsWith(".png")) return `${base}?w=${width}&fm=png&q=90`;
  if (lower.endsWith(".gif")) return `${base}?w=${width}&fm=gif`;
  return `${base}?w=${width}&auto=format&q=82`;
}

function studyLocalSrc(file) {
  return `assets/study/${encodeURIComponent(file)}`;
}

function escapeStudyAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

async function loadStudyImageSources() {
  if (window.sanityClient?.fetchStudyImages) {
    try {
      const docs = await window.sanityClient.fetchStudyImages();
      if (Array.isArray(docs) && docs.length > 0) {
        return docs
          .map((doc) => {
            if (doc.imageUrl) return studySizedImageUrl(doc.imageUrl, 1200);
            if (doc.legacyFilename) return studyLocalSrc(doc.legacyFilename);
            return null;
          })
          .filter(Boolean);
      }
    } catch (err) {
      console.warn("[study] Sanity fetch failed; using static study-images.json.", err);
    }
  }

  try {
    const res = await fetch("pages/study-images.json");
    if (res.ok) {
      const data = await res.json();
      const files = Array.isArray(data.images) ? data.images : [];
      return files.map((file) => studyLocalSrc(file));
    }
  } catch (err) {
    console.warn("[study] Static study-images.json failed.", err);
  }

  return [];
}

async function initStudyGallery() {
  const layout = document.getElementById("studyGrid");
  if (!layout) return;

  const sources = await loadStudyImageSources();

  if (!sources.length) {
    window.studyCatalogReady = true;
    window.studyPreload = { getAllUrls: () => [] };
    document.dispatchEvent(new CustomEvent("study:ready"));
    return;
  }

  const zones = ["tl", "tr", "bl", "br"];
  const perZone = Math.ceil(sources.length / zones.length);

  zones.forEach((zone, zi) => {
    const el = layout.querySelector(`[data-zone="${zone}"]`);
    if (!el) return;

    const slice = sources.slice(zi * perZone, (zi + 1) * perZone);
    el.innerHTML = slice
      .map(
        (src) => `
          <figure class="study-gallery__item">
            <img
              src="${escapeStudyAttr(src)}"
              alt=""
              loading="eager"
              decoding="async"
              draggable="false"
            />
          </figure>
        `
      )
      .join("");
  });

  window.studyCatalogReady = true;
  window.studyPreload = {
    getAllUrls: () => sources.slice(),
  };
  document.dispatchEvent(new CustomEvent("study:ready"));
}
