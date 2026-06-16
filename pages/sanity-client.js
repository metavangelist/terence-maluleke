(function () {
  const cfg = window.SANITY_CONFIG;
  if (!cfg?.projectId) return;

  const host = cfg.useCdn ? "apicdn" : "api";
  const base = `https://${cfg.projectId}.${host}.sanity.io/v${cfg.apiVersion}/data/query/${cfg.dataset}`;

  async function sanityQuery(query, params = {}) {
    const url = new URL(base);
    url.searchParams.set("query", query);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(`$${key}`, JSON.stringify(value));
    });

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Sanity query failed (${res.status})`);
    const json = await res.json();
    return json.result;
  }

  function imageUrl(source, options = {}) {
    if (!source?.asset?._ref) return null;
    const ref = source.asset._ref;
    const [, id, dimensions, format] = ref.split("-");
    const w = options.width ? `&w=${options.width}` : "";
    const h = options.height ? `&h=${options.height}` : "";
  const fit = options.fit ? `&fit=${options.fit}` : "";
    return `https://cdn.sanity.io/images/${cfg.projectId}/${cfg.dataset}/${id}-${dimensions}.${format || "jpg"}?auto=format${w}${h}${fit}`;
  }

  window.sanityClient = {
    query: sanityQuery,
    imageUrl,
    fetchGallery: () =>
      sanityQuery(
        `*[_type == "artwork"] | order(sortOrder asc, year desc) {
          _id, title, year, medium, dimensions, price, sold, legacyFilename,
          "imageUrl": image.asset->url
        }`
      ),
    fetchAssamblage: () =>
      sanityQuery(
        `*[_type == "assamblage"] | order(sortOrder asc) {
          _id, title, year, medium, dimensions, price, sold, legacyFilename,
          "imageUrl": image.asset->url
        }`
      ),
    fetchStudyImages: () =>
      sanityQuery(
        `*[_type == "studyImage"] | order(sortOrder asc) {
          _id, title, legacyFilename, "imageUrl": image.asset->url
        }`
      ),
    fetchExhibitions: () =>
      sanityQuery(
        `*[_type == "exhibition"] | order(eventDate asc) {
          _id, name, "slug": slug.current, eventDate, day, venue, detail, month, year
        }`
      ),
    fetchSiteSettings: () =>
      sanityQuery(`*[_id == "siteSettings"][0]{ siteTitle, enquiryEmail, instagramUrl }`),
    fetchArtistBio: () =>
      sanityQuery(`*[_id == "artistInfo"][0]{ bioPlain }`),
  };
})();
