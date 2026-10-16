const MAX_COVER_BYTES = 5 * 1024 * 1024;

const fetchBookCover = async (title, author) => {
  const cleanTitle = String(title || "").trim();
  const cleanAuthor = String(author || "").trim();
  if (!cleanTitle) return null;

  const searchParams = new URLSearchParams({
    title: cleanTitle,
    limit: "5",
    fields: "cover_i,title,author_name",
  });
  if (cleanAuthor) searchParams.set("author", cleanAuthor);

  const searchResponse = await fetch(
    `https://openlibrary.org/search.json?${searchParams.toString()}`,
    {
      headers: { Accept: "application/json", "User-Agent": "OrganizeUp/1.0" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!searchResponse.ok) return null;

  const searchData = await searchResponse.json();
  const matchingDoc = (searchData.docs || []).find((doc) => doc.cover_i);
  if (!matchingDoc?.cover_i) return null;

  const coverUrl = `https://covers.openlibrary.org/b/id/${matchingDoc.cover_i}-L.jpg`;
  const coverResponse = await fetch(coverUrl, {
    headers: { Accept: "image/avif,image/webp,image/*" },
    signal: AbortSignal.timeout(8000),
  });
  if (!coverResponse.ok) return null;

  const contentType = coverResponse.headers.get("content-type") || "";
  const declaredLength = Number(
    coverResponse.headers.get("content-length") || 0,
  );
  if (!contentType.startsWith("image/") || declaredLength > MAX_COVER_BYTES) {
    return null;
  }

  const buffer = Buffer.from(await coverResponse.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_COVER_BYTES) return null;

  const extension = contentType.split("/")[1]?.split(";")[0] || "jpeg";
  return {
    buffer,
    originalname: `openlibrary-${matchingDoc.cover_i}.${extension}`,
    mimetype: contentType,
    sourceUrl: coverUrl,
  };
};

module.exports = { fetchBookCover };
