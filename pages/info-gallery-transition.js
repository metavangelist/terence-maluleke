// Info/Gallery transition removed.
// Safe compatibility stub for old call-sites.

(function () {
  window.infoGalleryTransition = {
    measure: function () {},
    getMetrics: function () {
      return null;
    },
    updateFromScroll: function () {},
    revealGallery: function () {
      if (window.siteScroll?.scrollToSection) {
        window.siteScroll.scrollToSection("gallery");
      }
    },
    scrollToInfo: function () {
      if (window.siteScroll?.scrollToSection) {
        window.siteScroll.scrollToSection("info");
      }
    },
    scrollToGallery: function () {
      if (window.siteScroll?.scrollToSection) {
        window.siteScroll.scrollToSection("gallery");
      }
    },
    trackTop: function () {
      return 0;
    },
  };
})();