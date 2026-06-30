(function () {
  const path = window.location.pathname.replace(/\/$/, "").split("/").pop() || "index.html";
  const map = {
    "index.html": "home",
    "info.html": "info",
    "gallery.html": "paintings",
    "maquettes.html": "maquettes",
    "shows.html": "shows",
    "archives.html": "home",
    "study.html": "study",
    "spotify.html": "study",
  };
  const slug = map[path] || "home";
  const hash = slug === "home" ? "" : `#${slug}`;
  window.location.replace(`index.html${hash}`);
})();
