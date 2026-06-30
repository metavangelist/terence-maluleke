(function () {
  const SHOW_DAYS = [8, 16, 24];

  const STATIC_SHOWS = {
    "hidden-parts": {
      day: 8,
      name: "Hidden Parts",
      venue: "Southern Guild · Cape Town",
      detail:
        "New paintings and works on paper — ritual, memory, and the hidden life of everyday objects.",
    },
    "kasi-portraits": {
      day: 16,
      name: "Kasi Portraits",
      venue: "Gallery MOMO · Johannesburg",
      detail:
        "Solo presentation of new figurative paintings exploring township life and pan-African identity.",
    },
    "crimson-accord": {
      day: 24,
      name: "Crimson Accord",
      venue: "Circa Gallery · Johannesburg",
      detail:
        "A group presentation of recent canvases — colour, congregation, and the politics of gathering.",
    },
  };

  let SHOWS = { ...STATIC_SHOWS };

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const section = document.getElementById("section-calendar");
  const exhibEl = section?.querySelector(".exhib");
  const panelEl = section?.querySelector(".exhib-panel");
  const weeksEl = document.getElementById("exhibCalWeeks");
  const monthLabel = document.getElementById("exhibMonthLabel");
  const detailEl = document.getElementById("exhibDetail");
  const detailTitle = document.getElementById("exhibDetailTitle");
  const detailMeta = document.getElementById("exhibDetailMeta");
  const detailBody = document.getElementById("exhibDetailBody");
  const video = document.getElementById("exhibVideo");

  let activeShowId = null;
  let videoReady = false;
  let playPending = false;
  let calYear = 0;
  let calMonth = 0;
  let todayDay = 0;

  function parseEventDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return { year, month, day };
  }

  function showsFromSanityRows(rows) {
    const mapped = {};
    rows.forEach((row) => {
      const slug = row.slug || row.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (!slug) return;

      const parsed = parseEventDate(row.eventDate);
      mapped[slug] = {
        day: parsed?.day ?? row.day,
        month: parsed?.month ?? row.month,
        year: parsed?.year ?? row.year,
        name: row.name,
        venue: row.venue || "",
        detail: row.detail || "",
      };
    });
    return mapped;
  }

  async function loadShows() {
    if (!window.sanityClient?.fetchExhibitions) return;

    try {
      const rows = await window.sanityClient.fetchExhibitions();
      if (Array.isArray(rows) && rows.length) {
        SHOWS = showsFromSanityRows(rows);
      }
    } catch (_) {
      SHOWS = { ...STATIC_SHOWS };
    }
  }

  function getCalendarAnchor() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      today: now.getDate(),
    };
  }

  function syncShowsToCurrentMonth() {
    const anchor = getCalendarAnchor();
    const daysInMonth = new Date(anchor.year, anchor.month, 0).getDate();
    const ids = Object.keys(SHOWS);

    ids.forEach((id, index) => {
      const show = SHOWS[id];
      if (show.month && show.year) return;
      show.year = anchor.year;
      show.month = anchor.month;
      show.day = Math.min(SHOW_DAYS[index] ?? show.day, daysInMonth);
    });
  }

  function formatShowDate(show) {
    const d = new Date(show.year, show.month - 1, show.day);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function showIdForDay(day, year, month) {
    return (
      Object.entries(SHOWS).find(
        ([, show]) => show.year === year && show.month === month && show.day === day
      )?.[0] || null
    );
  }

  function createShowDot() {
    const dot = document.createElement("span");
    dot.className = "exhib-cal__show-dot";
    dot.setAttribute("aria-hidden", "true");
    return dot;
  }

  function createDayMarker(day, { isToday, showId, cell }) {
    const isShow = Boolean(showId);
    const el = document.createElement(isShow ? "button" : "span");
    el.className = "exhib-cal__marker";

    if (isShow) {
      el.type = "button";
      el.classList.add("exhib-cal__marker--show");
      el.dataset.showId = showId;
      el.setAttribute("aria-pressed", "false");
      if (isToday) {
        el.setAttribute("aria-label", `Today, ${formatShowDate(SHOWS[showId])}, exhibition`);
      }
      el.addEventListener("click", () => toggleShow(showId, cell));
    }

    if (isToday) el.classList.add("exhib-cal__marker--today");
    if (isShow) el.appendChild(createShowDot());

    const label = document.createElement("span");
    label.className = "exhib-cal__marker-label";
    label.textContent = String(day);
    el.appendChild(label);

    return el;
  }

  function buildCalendar() {
    if (!weeksEl) return;

    syncShowsToCurrentMonth();
    const anchor = getCalendarAnchor();
    calYear = anchor.year;
    calMonth = anchor.month;
    todayDay = anchor.today;

    const firstWeekday = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);

    weeksEl.innerHTML = "";

    for (let i = 0; i < cells.length; i += 7) {
      const week = document.createElement("div");
      week.className = "exhib-cal__week";

      cells.slice(i, i + 7).forEach((day) => {
        const cell = document.createElement("div");
        cell.className = "exhib-cal__day";

        if (day === null) {
          cell.classList.add("exhib-cal__day--empty");
          week.appendChild(cell);
          return;
        }

        const isToday = day === todayDay;
        const showId = showIdForDay(day, calYear, calMonth);
        const isMarked = isToday || Boolean(showId);

        if (isToday) {
          cell.classList.add("exhib-cal__day--today");
          cell.setAttribute("aria-current", "date");
        }

        if (showId) cell.classList.add("exhib-cal__day--show");
        if (!isMarked) cell.classList.add("exhib-cal__day--muted");

        cell.appendChild(createDayMarker(day, { isToday, showId, cell }));
        week.appendChild(cell);
      });

      weeksEl.appendChild(week);
    }

    if (monthLabel) {
      monthLabel.textContent = `${MONTH_NAMES[calMonth - 1]} ${calYear}`;
    }
  }

  function clearActiveDays() {
    document
      .querySelectorAll("#section-calendar .exhib-cal__day--show.is-active")
      .forEach((el) => {
        el.classList.remove("is-active");
        const btn = el.querySelector(".exhib-cal__marker--show");
        if (btn) btn.setAttribute("aria-pressed", "false");
      });
  }

  const DETAIL_WIDTH_STEPS = [380, 480, 560, 660, 760, 860];

  function resetDetailWidth() {
    if (!detailEl) return;
    detailEl.style.width = "";
    detailEl.style.maxWidth = "";
  }

  function fitExhibDetailWidth() {
    if (!panelEl || !detailEl || detailEl.hidden) {
      resetDetailWidth();
      exhibEl?.classList.remove("is-detail-open");
      return;
    }

    const topLimit = Math.max(
      80,
      parseFloat(getComputedStyle(document.documentElement).fontSize) * 5.25
    );
    const viewportBottom = window.innerHeight - 16;
    const maxW = Math.min(860, Math.floor(window.innerWidth * 0.94));
    const steps = DETAIL_WIDTH_STEPS.filter((w) => w <= maxW);
    if (!steps.length || steps[steps.length - 1] < maxW) steps.push(maxW);

    resetDetailWidth();
    exhibEl?.classList.remove("is-detail-open");

    for (const w of steps) {
      detailEl.style.width = `${w}px`;
      detailEl.style.maxWidth = "94vw";
      const rect = panelEl.getBoundingClientRect();
      if (rect.bottom <= viewportBottom && rect.top >= topLimit) return;
    }

    exhibEl?.classList.add("is-detail-open");
    if (exhibEl) exhibEl.scrollTop = 0;
  }

  function hideDetail() {
    activeShowId = null;
    if (detailEl) detailEl.hidden = true;
    exhibEl?.classList.remove("is-detail-open");
    clearActiveDays();
    resetDetailWidth();
    if (exhibEl) exhibEl.scrollTop = 0;
  }

  function showDetail(showId, cell) {
    const show = SHOWS[showId];
    if (!show || !detailEl) return;

    activeShowId = showId;
    clearActiveDays();
    cell.classList.add("is-active");
    const btn = cell.querySelector(".exhib-cal__marker--show");
    if (btn) btn.setAttribute("aria-pressed", "true");

    detailTitle.textContent = show.name;
    detailMeta.textContent = `${formatShowDate(show)} · ${show.venue}`;
    detailBody.textContent = show.detail;
    detailEl.hidden = false;
    requestAnimationFrame(() => {
      fitExhibDetailWidth();
    });
  }

  function toggleShow(showId, cell) {
    if (activeShowId === showId) hideDetail();
    else showDetail(showId, cell);
  }

  function markVideoReady() {
    if (!video) return;
    videoReady = true;
    video.classList.add("is-ready");
  }

  function ensureVideoLoaded() {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    if (video.preload === "none") video.preload = "auto";
    if (video.readyState === 0) video.load();
  }

  function bindPlayRetry() {
    if (!section || section.dataset.playRetryBound === "true") return;
    section.dataset.playRetryBound = "true";
    section.addEventListener(
      "pointerdown",
      () => {
        if (section.classList.contains("is-visible")) playVideo();
      },
      { passive: true }
    );
  }

  function playVideo() {
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    ensureVideoLoaded();
    bindPlayRetry();

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (playPending) return;
      playPending = true;
      const onReady = () => {
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("canplay", onReady);
        playPending = false;
        markVideoReady();
        if (section?.classList.contains("is-visible")) playVideo();
      };
      video.addEventListener("loadeddata", onReady);
      video.addEventListener("canplay", onReady);
      return;
    }

    markVideoReady();
    const attempt = video.play();
    if (attempt && typeof attempt.then === "function") {
      attempt.catch(() => {});
    }
  }

  function pauseVideo() {
    if (!video) return;
    playPending = false;
    video.pause();
  }

  function setShowsVisible(visible) {
    if (!section) return;
    if (visible) {
      section.classList.add("is-visible");
      playVideo();
    } else {
      section.classList.remove("is-visible");
      pauseVideo();
    }
  }

  function isShowsInView() {
    if (!section) return false;
    const scrollRoot = document.getElementById("siteScroller");
    const rootRect = scrollRoot?.getBoundingClientRect();
    const rect = section.getBoundingClientRect();
    if (!rootRect) return rect.top < window.innerHeight && rect.bottom > 0;
    return rect.top < rootRect.bottom && rect.bottom > rootRect.top;
  }

  function initVideo() {
    if (!video || !section) return;

    video.addEventListener("loadeddata", () => {
      markVideoReady();
      if (section.classList.contains("is-visible")) playVideo();
    }, { passive: true });

    video.addEventListener("error", () => {
      const fallback = video.querySelector('source[type="video/mp4"]:not([data-failed])');
      if (fallback) {
        fallback.dataset.failed = "true";
        video.load();
      }
    }, { passive: true });

    const scrollRoot = document.getElementById("siteScroller");

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.08) {
              setShowsVisible(true);
            } else if (!entry.isIntersecting || entry.intersectionRatio < 0.08) {
              setShowsVisible(false);
            }
          });
        },
        { root: scrollRoot || null, threshold: [0, 0.08, 0.35, 0.6] }
      );
      observer.observe(section);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseVideo();
      else if (section.classList.contains("is-visible")) playVideo();
    }, { passive: true });

    if (isShowsInView()) setShowsVisible(true);

    window.addEventListener(
      "resize",
      () => {
        if (detailEl && !detailEl.hidden) fitExhibDetailWidth();
      },
      { passive: true }
    );
  }

  function warmExhibitionsVideo() {
    ensureVideoLoaded();
  }

  window.playShowsVideo = () => setShowsVisible(true);
  window.pauseShowsVideo = () => setShowsVisible(false);

  document.addEventListener("site:ready", warmExhibitionsVideo, { once: true });
  document.addEventListener("gallery:ready", warmExhibitionsVideo, { once: true });

  async function initCalendar() {
    await loadShows();
    buildCalendar();
    initVideo();

    const slug = window.location.hash.replace(/^#/, "").toLowerCase();
    if (slug === "calendar" || slug === "shows" || slug === "exhibitions") {
      window.setTimeout(() => setShowsVisible(true), 120);
    }
  }

  initCalendar();
})();
