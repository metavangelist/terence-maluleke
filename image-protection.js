(function initImageProtection() {
  const ROOT_SELECTOR = "#siteScroller, .blob";

  function isProtectedTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    if (target.matches("img")) {
      return Boolean(target.closest(ROOT_SELECTOR));
    }

    return Boolean(
      target.closest(
        ".gallery-rico__frame, .gallery-index__cell, .study-gallery__item, .blob__painting"
      )
    );
  }

  function protectImage(img) {
    if (!(img instanceof HTMLImageElement) || img.dataset.imageProtected === "1") {
      return;
    }

    img.dataset.imageProtected = "1";
    img.draggable = false;
    img.setAttribute("draggable", "false");
    img.setAttribute("referrerpolicy", "no-referrer");
  }

  function scanImages(root = document) {
    root.querySelectorAll("img").forEach((img) => {
      if (img.closest(ROOT_SELECTOR)) {
        protectImage(img);
      }
    });
  }

  document.addEventListener(
    "contextmenu",
    (event) => {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    },
    { capture: true }
  );

  document.addEventListener(
    "dragstart",
    (event) => {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    },
    { capture: true }
  );

  document.addEventListener(
    "selectstart",
    (event) => {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    },
    { capture: true }
  );

  scanImages();

  const scroller = document.getElementById("siteScroller");
  if (scroller && "MutationObserver" in window) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) {
            protectImage(node);
            return;
          }

          if (node instanceof Element) {
            scanImages(node);
          }
        });
      }
    });

    observer.observe(scroller, { childList: true, subtree: true });
  }

  const blob = document.getElementById("blob");
  if (blob) {
    scanImages(blob);
  }
})();
