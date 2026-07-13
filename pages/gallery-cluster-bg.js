(function () {
  let userInteracted = false;

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

    if (document.getElementById("galleryClusterBg")?.classList.contains("is-visible")) {
      window.playGalleryClusterVideo?.();
    }
  }

  bindGalleryClusterBackground();

  document.addEventListener("touchstart", onUserInteraction, { passive: true, once: true });
  document.addEventListener("click", onUserInteraction, { passive: true, once: true });
  document.addEventListener("scroll", onUserInteraction, { passive: true, once: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) window.pauseGalleryClusterVideo?.();
    else if (document.getElementById("galleryClusterBg")?.classList.contains("is-visible")) {
      window.playGalleryClusterVideo?.();
    }
  }, { passive: true });
})();
