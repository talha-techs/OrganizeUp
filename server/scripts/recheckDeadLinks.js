const fs = require("fs");
const path = require("path");

const DEAD_ITEMS = [
  {
    id: "b-slp",
    type: "book",
    title: "Speech and Language Processing",
    url: "https://web.stanford.edu/~jurafsky/slp3/",
  },
  {
    id: "b-crafting",
    type: "book",
    title: "Crafting Interpreters",
    url: "https://craftinginterpreters.com/",
  },
  {
    id: "b-atbs",
    type: "book",
    title: "Automate the Boring Stuff with Python",
    url: "https://automatetheboringstuff.com/",
  },
  {
    id: "b-sutton",
    type: "book",
    title: "Reinforcement Learning: An Introduction",
    url: "http://incompleteideas.net/book/the-book-2nd.html",
  },
  {
    id: "b-beej",
    type: "book",
    title: "Beej's Guide to Network Programming",
    url: "https://beej.us/guide/bgnet/",
  },
  {
    id: "b-thinkstats",
    type: "book",
    title: "Think Stats",
    url: "https://greenteapress.com/wp/think-stats-2e/",
  },
  {
    id: "c-cs224n",
    type: "course",
    title: "Stanford CS224n: NLP with Deep Learning",
    url: "https://web.stanford.edu/class/cs224n/",
  },
  {
    id: "c-mlcc",
    type: "course",
    title: "Google Machine Learning Crash Course",
    url: "https://developers.google.com/machine-learning/crashcourse",
  },
  {
    id: "t-freefordev",
    type: "tool",
    title: "free-for-dev",
    url: "https://github.com/ripienaar/free-for-dev",
  },
];

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function testSingleAttempt(url) {
  // First try HEAD
  let headRes = null;
  try {
    headRes = await fetch(url, {
      method: "HEAD",
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    headRes = null;
  }

  if (headRes && headRes.status >= 200 && headRes.status < 400) {
    return { status: "ok", code: headRes.status };
  }

  // GET fallback
  try {
    const getRes = await fetch(url, {
      method: "GET",
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });

    const code = getRes.status;
    if (code >= 200 && code < 400) {
      return { status: "ok", code };
    }
    if (code === 404 || code === 410) {
      return { status: "dead", code, reason: `HTTP ${code} Not Found` };
    }
    // 403, 429, 5xx
    return { status: "unverified", code, reason: `HTTP ${code}` };
  } catch (err) {
    const msg = err.message || "";
    const isDnsFailure =
      msg.includes("ENOTFOUND") ||
      msg.includes("getaddrinfo") ||
      err.cause?.code === "ENOTFOUND";

    if (isDnsFailure) {
      return { status: "dead", code: 0, reason: `DNS failure (ENOTFOUND)` };
    }

    // Timeout / abort / network drop = unverified
    return {
      status: "unverified",
      code: 0,
      reason: err.name === "TimeoutError" || msg.includes("timeout") ? "Timeout after 20s" : `Network issue (${msg})`,
    };
  }
}

async function checkWithRetries(item) {
  console.log(`\nRe-checking ${item.id} (${item.title}): ${item.url}`);
  let lastResult = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    process.stdout.write(`  Attempt ${attempt}/3... `);
    const result = await testSingleAttempt(item.url);
    console.log(`${result.status.toUpperCase()} (${result.code || result.reason})`);
    lastResult = result;

    if (result.status === "ok") {
      return { ...item, ...result };
    }

    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return { ...item, ...lastResult };
}

async function main() {
  console.log("==============================================================");
  console.log("  Re-checking 9 Previous Dead Links Concurrently (3 attempts, 20s timeout)");
  console.log("==============================================================");

  const recheckResults = await Promise.all(
    DEAD_ITEMS.map((item) => checkWithRetries(item))
  );

  // Load existing link-report.json
  const reportPath = path.resolve(__dirname, "../seed/link-report.json");
  const existingReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));

  const finalOk = [...existingReport.ok];
  const finalUnverified = [...existingReport.unverified];
  const finalDead = [];

  for (const r of recheckResults) {
    const entry = {
      id: r.id,
      type: r.type,
      title: r.title,
      url: r.url,
      code: r.code,
      reason: r.reason || undefined,
    };

    if (r.status === "ok") {
      finalOk.push(entry);
    } else if (r.status === "unverified") {
      finalUnverified.push(entry);
    } else {
      finalDead.push(entry);
    }
  }

  const updatedReport = {
    generatedAt: new Date().toISOString(),
    totalChecked: finalOk.length + finalUnverified.length + finalDead.length,
    ok: finalOk,
    unverified: finalUnverified,
    dead: finalDead,
  };

  fs.writeFileSync(reportPath, JSON.stringify(updatedReport, null, 2), "utf8");

  console.log("\n==============================================================");
  console.log("  📊 Final Link Report Summary");
  console.log("==============================================================");
  console.log(`  Total: ${updatedReport.totalChecked}`);
  console.log(`  OK (${finalOk.length}):`);
  finalOk.forEach((o) => console.log(`    ✅ [${o.id}] ${o.title} (${o.url})`));
  console.log(`\n  UNVERIFIED [Will be inserted] (${finalUnverified.length}):`);
  finalUnverified.forEach((u) => console.log(`    ⚠️ [${u.id}] ${u.title}: ${u.reason || u.code} (${u.url})`));
  console.log(`\n  DEAD [Will NOT be inserted] (${finalDead.length}):`);
  finalDead.forEach((d) => console.log(`    ❌ [${d.id}] ${d.title}: ${d.reason || d.code} (${d.url})`));
  console.log("==============================================================");
}

main().catch(console.error);
