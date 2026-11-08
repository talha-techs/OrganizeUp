const fs = require("fs");
const path = require("path");

const candidates = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../seed/playlist-candidates.json"), "utf8")
);

const approvedList = [];
const manualList = [];

for (const item of candidates) {
  const hint = (item.channelHint || "").trim().toLowerCase();
  const cands = item.candidates || [];

  // Match channelTitle equals channelHint (case-insensitive)
  const channelMatches = cands.filter(
    (c) => (c.channelTitle || "").trim().toLowerCase() === hint
  );

  let best = null;
  if (channelMatches.length > 0) {
    const titleWords = item.catalogTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .split(" ")
      .filter((w) => w.length > 2 && w !== "harvard" && w !== "lectures" && w !== "playlist");

    const scored = channelMatches.map((c) => {
      const ct = c.title.toLowerCase();
      let matchCount = 0;
      titleWords.forEach((w) => {
        if (ct.includes(w)) matchCount++;
      });
      return { ...c, matchCount };
    });

    scored.sort((a, b) => b.matchCount - a.matchCount || b.videoCount - a.videoCount);

    // Only if clear best match (or single candidate)
    if (scored[0].matchCount > 0 && (scored.length === 1 || scored[0].matchCount > (scored[1]?.matchCount || 0))) {
      best = scored[0];
    } else if (channelMatches.length === 1) {
      best = channelMatches[0];
    }
  }

  if (best) {
    approvedList.push({
      id: item.id,
      title: best.title,
      playlistId: best.playlistId,
      channelTitle: best.channelTitle,
      videoCount: best.videoCount,
      url: best.url,
      thumbnail: best.thumbnail,
      catalogTitle: item.catalogTitle,
    });
  } else {
    manualList.push({
      id: item.id,
      catalogTitle: item.catalogTitle,
      channelHint: item.channelHint,
      top3: cands.slice(0, 3),
    });
  }
}

// Write server/seed/playlist-approved.json
const approvedPath = path.resolve(__dirname, "../seed/playlist-approved.json");
fs.writeFileSync(approvedPath, JSON.stringify(approvedList, null, 2), "utf8");

console.log("==============================================================");
console.log(`  Auto-Approved Playlists (${approvedList.length}/${candidates.length}):`);
console.log("==============================================================");
approvedList.forEach((a) => {
  console.log(`  ✅ [${a.id}] ${a.catalogTitle}`);
  console.log(`     Matched: "${a.title}" | Channel: ${a.channelTitle} | ${a.videoCount} videos`);
  console.log(`     URL: ${a.url}\n`);
});

console.log("==============================================================");
console.log(`  Awaiting Manual Choice (${manualList.length}/${candidates.length}):`);
console.log("==============================================================");
manualList.forEach((m) => {
  console.log(`  ❓ [${m.id}] ${m.catalogTitle} (Hint: "${m.channelHint}")`);
  m.top3.forEach((c, idx) => {
    console.log(`     ${idx + 1}. "${c.title}" | Channel: ${c.channelTitle} | ${c.videoCount} videos`);
    console.log(`        URL: ${c.url}`);
  });
  console.log("");
});

