(function () {
  const SITE_PAGES = [
    "index.html",
    "info.html",
    "gallery.html",
    "shows.html",
    "archives.html",
    "study.html",
  ];

  function currentPageFile() {
    let segment = window.location.pathname.replace(/\/$/, "").split("/").filter(Boolean).pop();
    if (!segment || segment === "index") return "index.html";
    return segment.endsWith(".html") ? segment : `${segment}.html`;
  }

  function initSiteNav() {
    const nav = document.getElementById("siteNav");
    if (!nav) return;

    const index = SITE_PAGES.indexOf(currentPageFile());
    if (index < 0) return;

    const backEl = nav.querySelector(".site-nav__back");
    const homeEl = nav.querySelector(".site-nav__home");
    const nextEl = nav.querySelector(".site-nav__next");
    if (!backEl || !homeEl || !nextEl) return;

    const showHome = index >= 2;

    if (index === 0) {
      backEl.hidden = true;
    } else {
      backEl.hidden = false;
      backEl.href = SITE_PAGES[index - 1];
    }

    homeEl.hidden = !showHome;
    if (showHome) {
      homeEl.href = "index.html";
    }

    const nextIndex = (index + 1) % SITE_PAGES.length;
    nextEl.href = SITE_PAGES[nextIndex];
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSiteNav);
  } else {
    initSiteNav();
  }
})();
