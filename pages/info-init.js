function isMobileView() {
  return window.matchMedia("(max-width: 768px)").matches;
}

const INFO_ARCHIVE_VIDEOS = [
  "videos/info/archives/archive-1a0cc41b.mp4",
  "videos/info/archives/archive-621e3fef.mp4",
  "videos/info/archives/archive-fathers-graduation-party.mp4",
];

let infoStarVideosReadyPromise = null;
let siteMediaReadyPromise = null;
const videoUrlReadyCache = new Map();

function starVideoSource(video) {
  if (!video) return "";
  return (
    video.dataset.starSrc ||
    video.getAttribute("src") ||
    video.currentSrc ||
    video.querySelector("source")?.getAttribute("src") ||
    ""
  );
}

function normalizeVideoUrl(url) {
  if (!url) return "";
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

function configureMutedLoopVideo(video, preload = "auto") {
  if (!video) return;

  const previousPreload = video.getAttribute("preload") || video.preload || "";

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.preload = preload;
  video.setAttribute("preload", preload);
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("loop", "");

  // Upgrading from metadata/none to auto needs an explicit load kick.
  if (
    preload === "auto" &&
    previousPreload !== "auto" &&
    video.readyState < 2 &&
    (video.currentSrc || video.querySelector("source") || video.getAttribute("src"))
  ) {
    try {
      video.load();
    } catch {
      /* ignore */
    }
  }
}

function waitForVideoFrame(video, timeoutMs = 20000) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(video);
    };

    if (!video) {
      finish();
      return;
    }

    if (video.readyState >= 2) {
      finish();
      return;
    }

    const onReady = () => finish();
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("canplay", onReady, { once: true });
    video.addEventListener("error", onReady, { once: true });
    window.setTimeout(finish, timeoutMs);
  });
}

async function tryPlayVideo(video) {
  if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  try {
    await video.play();
  } catch {
    /* autoplay may stay blocked until visible */
  }
}

function ensureVideoHasSource(video, url) {
  if (!video || !url) return;

  const absolute = normalizeVideoUrl(url);
  const current = normalizeVideoUrl(video.currentSrc || video.getAttribute("src") || "");

  if (current === absolute) {
    configureMutedLoopVideo(video, "auto");
    return;
  }

  // Prefer attribute src for star videos; keep <source> children for cube/bg.
  if (video.dataset.infoStarVideo !== undefined || video.classList.contains("info-star__video")) {
    video.setAttribute("src", url);
    video.src = url;
  } else if (!video.querySelector("source") && !video.getAttribute("src")) {
    video.setAttribute("src", url);
    video.src = url;
  }

  configureMutedLoopVideo(video, "auto");
}

async function warmVideoElement(video, { timeoutMs = 20000 } = {}) {
  if (!video) return null;

  const url = starVideoSource(video);
  const cacheKey = normalizeVideoUrl(url) || `el:${video.id || Math.random()}`;

  ensureVideoHasSource(video, url);
  configureMutedLoopVideo(video, "auto");

  let primaryPromise = videoUrlReadyCache.get(cacheKey);

  if (!primaryPromise) {
    // Register immediately so parallel callers with the same URL await one load.
    primaryPromise = waitForVideoFrame(video, timeoutMs).then(() => true);
    videoUrlReadyCache.set(cacheKey, primaryPromise);
    await primaryPromise;
    return video;
  }

  await primaryPromise;

  if (video.readyState < 2) {
    await waitForVideoFrame(video, Math.min(timeoutMs, 8000));
  }

  return video;
}

async function warmVideoList(videos, { concurrency = 4, timeoutMs = 20000 } = {}) {
  const queue = videos.filter(Boolean);
  if (!queue.length) return;

  let index = 0;

  async function worker() {
    while (index < queue.length) {
      const video = queue[index];
      index += 1;
      await warmVideoElement(video, { timeoutMs });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, () => worker())
  );
}

function markInfoStarsReady() {
  document.getElementById("infoStars")?.classList.add("is-ready");
  document.getElementById("infoStarsBack")?.classList.add("is-ready");
  document.getElementById("homeStars")?.classList.add("is-ready");
  document.getElementById("homeStarsBack")?.classList.add("is-ready");
  document.dispatchEvent(new CustomEvent("info-stars:ready"));
}

function collectSiteVideos() {
  const homeStars = [
    ...document.querySelectorAll("#section-home .info-star__video[data-info-star-video]"),
  ];
  const infoStars = [
    ...document.querySelectorAll("#section-info .info-star__video[data-info-star-video]"),
  ];
  const infoBg = document.getElementById("infoBgVideo");
  const cubeVideos = [...document.querySelectorAll("#section-info .info-cube__video[data-info-video]")];
  const exhibVideo = document.getElementById("exhibVideo");

  return { homeStars, infoStars, infoBg, cubeVideos, exhibVideo };
}

function ensureInfoStarVideosReady() {
  if (infoStarVideosReadyPromise) return infoStarVideosReadyPromise;

  infoStarVideosReadyPromise = ensureSiteMediaReady().catch(() => {
    markInfoStarsReady();
    return true;
  });
  window.infoStarVideosReady = infoStarVideosReadyPromise;
  return infoStarVideosReadyPromise;
}

async function ensureSiteMediaReady() {
  if (siteMediaReadyPromise) return siteMediaReadyPromise;

  siteMediaReadyPromise = (async () => {
    const {
      homeStars,
      infoStars,
      infoBg,
      cubeVideos,
      exhibVideo,
    } = collectSiteVideos();

    [...homeStars, ...infoStars].forEach((video) => {
      ensureVideoHasSource(video, starVideoSource(video));
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markInfoStarsReady();
      return true;
    }

    await warmVideoList(homeStars, { concurrency: 6, timeoutMs: 5000 });
    markInfoStarsReady();
    homeStars.forEach((video) => tryPlayVideo(video));

    void (async () => {
      await Promise.all([
        warmVideoList(infoStars, { concurrency: 3, timeoutMs: 20000 }),
        warmVideoElement(infoBg, { timeoutMs: 15000 }),
      ]);
      [...infoStars, infoBg].forEach((video) => tryPlayVideo(video));

      await Promise.all([
        warmVideoList(cubeVideos, { concurrency: 3, timeoutMs: 25000 }),
        warmVideoElement(exhibVideo, { timeoutMs: 25000 }),
      ]);
      cubeVideos.forEach((video) => tryPlayVideo(video));
      tryPlayVideo(exhibVideo);
    })().catch(() => {});

    return true;
  })().catch(() => {
    markInfoStarsReady();
    return true;
  });

  return siteMediaReadyPromise;
}

window.warmInfoStarVideos = ensureInfoStarVideosReady;
window.ensureSiteMediaReady = ensureSiteMediaReady;
window.INFO_ARCHIVE_VIDEOS = INFO_ARCHIVE_VIDEOS;

function initInfoStars() {
  document
    .querySelectorAll("#section-info .info-star__video, #section-home .info-star__video")
    .forEach((video) => {
      ensureVideoHasSource(video, starVideoSource(video));
    });
}

function getDefaultBioText() {
  const source = document.getElementById("bioTextSource");
  if (!source) return "";
  return source.textContent.replace(/\s+/g, " ").trim();
}

function portableTextHasContent(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) return false;
  return blocks.some((block) =>
    block.children?.some(
      (child) => typeof child.text === "string" && child.text.trim().length > 0
    )
  );
}

function portableTextToPlain(blocks) {
  if (!portableTextHasContent(blocks)) return "";
  return blocks
    .filter((block) => block._type === "block")
    .map((block) => (block.children || []).map((child) => child.text || "").join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveBioText(cmsData) {
  const fromPortable = portableTextToPlain(cmsData?.bio);
  if (fromPortable) return fromPortable;
  return getDefaultBioText();
}

async function buildInfoBio() {
  const bio = document.getElementById("infoBio");
  if (!bio) return;

  bio.textContent = getDefaultBioText();

  const client = window.sanityClient;
  if (!client?.fetchArtistBio) return;

  try {
    const data = await client.fetchArtistBio();
    bio.textContent = resolveBioText(data);
  } catch {
    /* keep default bio */
  }
}

function initCubeRotation() {
  const wrap = document.getElementById("infoCubeWrap");
  const cube = document.getElementById("infoCube");
  const section = document.getElementById("section-info");

  if (!wrap || !cube) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let rotX = -24;
  let rotY = 34;
  let dragging = false;
  let pointerId = null;
  let lastX = 0;
  let lastY = 0;
  let velX = 0;
  let velY = 0;
  let inertiaFrame = 0;
  let autoFrame = 0;
  let sectionVisible = false;

  const clampX = (value) => Math.max(-82, Math.min(82, value));

  function applyRotation() {
    cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }

  function stopInertia() {
    if (inertiaFrame) {
      cancelAnimationFrame(inertiaFrame);
      inertiaFrame = 0;
    }
  }

  function tickAuto() {
    autoFrame = requestAnimationFrame(tickAuto);

    if (reduceMotion || !sectionVisible || dragging || inertiaFrame) return;

    rotY += 0.14;
    applyRotation();
  }

  function startAuto() {
    if (reduceMotion || autoFrame) return;
    autoFrame = requestAnimationFrame(tickAuto);
  }

  function stopAuto() {
    if (!autoFrame) return;
    cancelAnimationFrame(autoFrame);
    autoFrame = 0;
  }

  function startInertia() {
    stopInertia();

    const step = () => {
      velX *= 0.94;
      velY *= 0.94;

      if (Math.abs(velX) < 0.02 && Math.abs(velY) < 0.02) {
        inertiaFrame = 0;
        return;
      }

      rotY += velY;
      rotX = clampX(rotX + velX);
      applyRotation();
      inertiaFrame = requestAnimationFrame(step);
    };

    inertiaFrame = requestAnimationFrame(step);
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;

    dragging = true;
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    velX = 0;
    velY = 0;
    stopInertia();

    wrap.classList.add("is-dragging");
    wrap.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== pointerId) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;

    lastX = event.clientX;
    lastY = event.clientY;

    rotY += dx * 0.45;
    rotX = clampX(rotX - dy * 0.45);
    velX = -dy * 0.12;
    velY = dx * 0.12;

    applyRotation();
    event.preventDefault();
  }

  function onPointerUp(event) {
    if (!dragging || event.pointerId !== pointerId) return;

    dragging = false;
    pointerId = null;
    wrap.classList.remove("is-dragging");

    if (wrap.hasPointerCapture(event.pointerId)) {
      wrap.releasePointerCapture(event.pointerId);
    }

    startInertia();
  }

  applyRotation();
  startAuto();

  if (section && "IntersectionObserver" in window) {
    const scrollRoot = document.getElementById("siteScroller");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          sectionVisible = entry.isIntersecting;
          if (sectionVisible) startAuto();
          else stopAuto();
        });
      },
      { root: scrollRoot || null, threshold: 0.15 }
    );
    observer.observe(section);
  } else {
    sectionVisible = true;
  }

  wrap.addEventListener("pointerdown", onPointerDown);
  wrap.addEventListener("pointermove", onPointerMove);
  wrap.addEventListener("pointerup", onPointerUp);
  wrap.addEventListener("pointercancel", onPointerUp);

  wrap.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
  wrap.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
}

function initInfoBgVideo() {
  const section = document.getElementById("section-info");
  const bg = document.getElementById("infoBgVideo");

  if (!section || !bg) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  bg.muted = true;
  bg.defaultMuted = true;
  bg.loop = true;
  bg.playsInline = true;
  bg.preload = "auto";
  bg.setAttribute("loop", "");
  bg.setAttribute("muted", "");

  function playBg() {
    if (reduceMotion) return;
    bg.play().catch(() => {});
  }

  function pauseBg() {
    bg.pause();
  }

  function ensureLoop() {
    if (bg.currentTime > 0 && bg.duration && bg.currentTime >= bg.duration - 0.05) {
      bg.currentTime = 0;
    }
    playBg();
  }

  bg.addEventListener("ended", () => {
    bg.currentTime = 0;
    playBg();
  });

  bg.addEventListener("loadeddata", playBg);
  bg.addEventListener("canplay", playBg);

  if (bg.readyState >= 2) {
    playBg();
  }

  if (!("IntersectionObserver" in window)) {
    playBg();
    return;
  }

  const scrollRoot = document.getElementById("siteScroller");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          playBg();
          return;
        }
        pauseBg();
      });
    },
    { root: scrollRoot || null, threshold: [0, 0.01, 0.25, 0.5] }
  );

  observer.observe(section);

  function syncWithRoute() {
    if (document.body.dataset.currentSection === "info") {
      playBg();
    }
  }

  document.addEventListener("site:ready", syncWithRoute, { once: true });
  document.getElementById("siteScroller")?.addEventListener("scroll", () => {
    window.requestAnimationFrame(() => {
      ensureLoop();
      syncWithRoute();
    });
  }, { passive: true });

  syncWithRoute();
}

function initInfoVideos() {
  const section = document.getElementById("section-info");
  const videos = section?.querySelectorAll(".info-cube__video[data-info-video]");

  if (!section || !videos?.length) return;

  const primeCubeVideo = (video) => {
    if (video.readyState >= 2) return;
    video.muted = true;
    video.preload = "auto";
    video.load();
  };

  const playAll = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    videos.forEach((video) => {
      primeCubeVideo(video);
      video.muted = true;
      video.play().catch(() => {});
    });
  };

  const pauseAll = () => {
    videos.forEach((video) => video.pause());
  };

  if (!("IntersectionObserver" in window)) {
    playAll();
    return;
  }

  const scrollRoot = document.getElementById("siteScroller");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.15) playAll();
        else pauseAll();
      });
    },
    { root: scrollRoot || null, threshold: [0, 0.15, 0.35] }
  );

  observer.observe(section);
}

function initInfoStarVideos() {
  const sections = ["section-info", "section-home"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length) return;

  const playSection = (section) => {
    section.querySelectorAll(".info-star__video[data-info-star-video]").forEach((video) => {
      if (video.paused) {
        video.play().catch(() => {});
      }
    });
  };

  ensureInfoStarVideosReady().then(() => {
    sections.forEach(playSection);
  });

  if (!("IntersectionObserver" in window)) return;

  const scrollRoot = document.getElementById("siteScroller");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.12) {
          playSection(entry.target);
        }
      });
    },
    { root: scrollRoot || null, threshold: [0, 0.12, 0.3] }
  );

  sections.forEach((section) => observer.observe(section));
}

function initPoemParallax() {
  const scroller = document.getElementById("siteScroller");
  const poemLayer = document.getElementById("poemLayer");
  const poemLeft = document.getElementById("poemLeft");
  const poemRight = document.getElementById("poemRight");
  const infoGallery = document.getElementById("section-info-gallery");
  const infoSection = document.getElementById("section-info");
  const gallerySection = document.getElementById("section-gallery");

  if (
    !scroller ||
    !poemLayer ||
    !poemLeft ||
    !poemRight ||
    !infoGallery ||
    !infoSection
  ) {
    return;
  }

  let ticking = false;
  let viewportH = 0;
  let infoStart = 0;
  let poemTravel = 0;

  function getOffsetTopWithinScroller(el) {
    let y = 0;
    let node = el;

    while (node && node !== scroller) {
      y += node.offsetTop || 0;
      node = node.offsetParent;
    }

    return y;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function measurePoems() {
    viewportH = scroller.clientHeight || window.innerHeight;
    infoStart = getOffsetTopWithinScroller(infoGallery);

    const tallestPoem = Math.max(poemLeft.scrollHeight, poemRight.scrollHeight);

    poemTravel = tallestPoem + viewportH * 1.45;

    poemLeft.style.top = "0px";
    poemRight.style.top = "0px";

    updatePoems();
  }

  function updatePoems() {
    ticking = false;

    if (isMobileView()) {
      poemLayer.style.opacity = "";
      poemLeft.style.transform = "";
      poemRight.style.transform = "";
      infoSection.classList.remove("poems-finished");
      return;
    }

    const localY = Math.max(0, scroller.scrollTop - infoStart);

    const sectionScrollLength = Math.max(
      viewportH,
      (infoGallery.offsetHeight || viewportH * 2) - viewportH
    );

    const progress = clamp(localY / sectionScrollLength, 0, 1);

    const leftStart = viewportH * 0.92;
    const rightStart = viewportH * 1.08;

    const leftEnd = -poemTravel * 0.98;
    const rightEnd = -poemTravel * 1.04;

    const leftY = leftStart + (leftEnd - leftStart) * progress;
    const rightY = rightStart + (rightEnd - rightStart) * progress;

    poemLeft.style.transform = `translate3d(0, ${leftY}px, 0)`;
    poemRight.style.transform = `translate3d(0, ${rightY}px, 0)`;

    const fadeStart = 0.88;
    const fadeProgress = clamp((progress - fadeStart) / (1 - fadeStart), 0, 1);
    poemLayer.style.opacity = String(1 - fadeProgress);

    const poemsFinished = progress > 0.9;
    infoSection.classList.toggle("poems-finished", poemsFinished);

    if (gallerySection) {
      gallerySection.classList.toggle("poems-finished", poemsFinished);
    }
  }

  function requestPoemUpdate() {
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(updatePoems);
  }

  scroller.addEventListener("scroll", requestPoemUpdate, { passive: true });

  window.addEventListener("resize", measurePoems);

  if (document.fonts?.ready) {
    document.fonts.ready.then(measurePoems);
  }

  window.addEventListener("load", measurePoems);

  measurePoems();
}

buildInfoBio();
initInfoStars();
ensureInfoStarVideosReady();
initCubeRotation();
initInfoBgVideo();
initInfoVideos();
initInfoStarVideos();
initPoemParallax();
