(function () {
  const CROSS_SECTIONS = [
    {
      sectionId: "section-study",
      videoId: "studyVideo",
      playKey: "playStudyVideo",
      pauseKey: "pauseStudyVideo",
      slugs: ["study", "spotify"],
    },
    {
      sectionId: "section-gallery",
      videoId: "galleryCrossVideo",
      playKey: "playGalleryCrossVideo",
      pauseKey: "pauseGalleryCrossVideo",
      slugs: ["gallery", "paintings"],
    },
    {
      sectionId: "section-prints",
      videoId: "printsCrossVideo",
      playKey: "playPrintsCrossVideo",
      pauseKey: "pausePrintsCrossVideo",
      slugs: ["prints"],
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

  function onUserInteraction() {
    if (userInteracted) return;
    userInteracted = true;

    CROSS_SECTIONS.forEach(({ sectionId, playKey }) => {
      const section = document.getElementById(sectionId);
      if (section?.classList.contains("is-visible")) {
        window[playKey]?.();
      }
    });
  }

  CROSS_SECTIONS.forEach(bindCrossSection);

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
  }, { passive: true });

  initStudyGallery();
})();

async function initStudyGallery() {
  const layout = document.getElementById("studyGrid");
  if (!layout) return;

  let files = [];
  try {
    const res = await fetch("pages/study-images.json");
    if (res.ok) {
      const data = await res.json();
      files = Array.isArray(data.images) ? data.images : [];
    }
  } catch {}

  if (!files.length) return;

  const zones = ["tl", "tr", "bl", "br"];
  const perZone = Math.ceil(files.length / zones.length);

  zones.forEach((zone, zi) => {
    const el = layout.querySelector(`[data-zone="${zone}"]`);
    if (!el) return;

    const slice = files.slice(zi * perZone, (zi + 1) * perZone);
    el.innerHTML = slice
      .map(
        (file) => `
          <figure class="study-gallery__item">
            <img
              src="assets/study/${encodeURIComponent(file)}"
              alt=""
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </figure>
        `
      )
      .join("");
  });
}
