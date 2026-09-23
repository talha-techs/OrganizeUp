/**
 * Smart Clipboard Classifier for Custom Section Blocks
 * Automatically detects whether clipboard content is an Image, URL, Checklist, Code Snippet, or Note.
 */

// Heuristics for language detection
function detectLanguage(code) {
  const trimmed = code.trim();

  // JSON
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch (_) {}
  }

  // HTML / XML / JSX
  if (
    /<!DOCTYPE\s+html/i.test(trimmed) ||
    /<(html|head|body|div|span|p|a|ul|li|button|input|table|section|article)\b/i.test(
      trimmed,
    ) ||
    /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(trimmed)
  ) {
    return "html";
  }

  // CSS / SCSS
  if (
    /(@media|@keyframes|@import|\.[\w-]+\s*\{|#[\w-]+\s*\{)/.test(trimmed) &&
    /:\s*[^;]+;/.test(trimmed)
  ) {
    return "css";
  }

  // SQL
  if (
    /\b(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i.test(
      trimmed,
    )
  ) {
    return "sql";
  }

  // Python
  if (
    /\b(def\s+\w+\s*\(.*?\):|class\s+\w+(\(.*?\))?:|import\s+\w+|from\s+\w+\s+import|elif\s+|if\s+__name__\s*==\s*['"]__main__['"])\b/.test(
      trimmed,
    )
  ) {
    return "python";
  }

  // TypeScript
  if (
    /\b(interface\s+\w+|type\s+\w+\s*=|as\s+const|:\s*(string|number|boolean|any)\[\])\b/.test(
      trimmed,
    )
  ) {
    return "typescript";
  }

  // Shell / Bash
  if (
    /^#!(\/usr)?\/bin\/(bash|sh|zsh)/.test(trimmed) ||
    /^(npm|npx|pnpm|yarn|git|docker|curl|wget|chmod|chown)\s+/m.test(trimmed)
  ) {
    return "shell";
  }

  // Rust
  if (
    /\b(fn\s+\w+\s*\(|let\s+mut\s+|impl\s+|match\s+\w+\s*\{|pub\s+fn)\b/.test(
      trimmed,
    )
  ) {
    return "rust";
  }

  // Go
  if (
    /\b(func\s+\w+\s*\(|package\s+\w+|import\s+\(\s*".*?"\s*\))\b/.test(trimmed)
  ) {
    return "go";
  }

  // Default to javascript if typical JS keywords present
  if (
    /\b(const|let|var|function|return|import|export|class|console\.log|=>)\b/.test(
      trimmed,
    ) ||
    /;\s*$/.test(trimmed)
  ) {
    return "javascript";
  }

  return "javascript";
}

// Checks if multi-line text is likely source code
function isCodeSnippet(text) {
  const trimmed = text.trim();
  const lines = trimmed.split("\n");

  // Markdown code fence ```lang ... ```
  const codeBlockMatch = trimmed.match(/^```(\w+)?\n([\s\S]*?)```$/);
  if (codeBlockMatch) {
    return {
      isCode: true,
      language: codeBlockMatch[1] || detectLanguage(codeBlockMatch[2]),
      cleanCode: codeBlockMatch[2].trim(),
    };
  }

  // Common programming constructs
  const codeKeywords = [
    /\b(const|let|var)\s+\w+\s*=\s*/,
    /\bfunction\s*\w*\s*\(.*?\)\s*\{/,
    /\b(class|interface)\s+\w+/,
    /\bimport\s+.*?from\s+['"]/,
    /\bexport\s+(default\s+)?/,
    /=>\s*\{?/,
    /\bdef\s+\w+\s*\(.*?\):/,
    /\bpublic\s+(static\s+)?(void|class|int|String)/,
    /;\s*$/,
    /\{\s*$/,
  ];

  let matches = 0;
  for (const kw of codeKeywords) {
    if (kw.test(trimmed)) matches++;
  }

  // Indentation check: if multiple lines have indentation or braces
  const hasIndentOrBraces =
    lines.length > 2 &&
    lines.filter((l) => /^\s{2,}|\t|\{|\}/.test(l)).length >= lines.length * 0.4;

  if (matches >= 2 || (matches >= 1 && hasIndentOrBraces)) {
    return {
      isCode: true,
      language: detectLanguage(trimmed),
      cleanCode: trimmed,
    };
  }

  return { isCode: false };
}

// Checks if text is a list of tasks / checklist
function isTaskList(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { isTask: false };

  // Task regexes
  const markdownTaskRegex = /^[-*+]\s*\[([ xX])\]\s*(.+)$/;
  const bracketTaskRegex = /^\[([ xX])\]\s*(.+)$/;
  const bulletTaskRegex = /^[-*•]\s*(.+)$/;
  const numberedTaskRegex = /^\d+[\.\)]\s*(.+)$/;

  let matchedTasks = [];

  for (const line of lines) {
    let m = line.match(markdownTaskRegex);
    if (m) {
      matchedTasks.push({
        text: m[2].trim(),
        checked: m[1].toLowerCase() === "x",
      });
      continue;
    }

    m = line.match(bracketTaskRegex);
    if (m) {
      matchedTasks.push({
        text: m[2].trim(),
        checked: m[1].toLowerCase() === "x",
      });
      continue;
    }

    m = line.match(bulletTaskRegex);
    if (m) {
      matchedTasks.push({
        text: m[1].trim(),
        checked: false,
      });
      continue;
    }

    m = line.match(numberedTaskRegex);
    if (m) {
      matchedTasks.push({
        text: m[1].trim(),
        checked: false,
      });
      continue;
    }
  }

  // If at least 2 lines and >50% matched task patterns, or explicitly markdown checked
  if (
    matchedTasks.length >= 2 &&
    matchedTasks.length >= Math.floor(lines.length * 0.6)
  ) {
    return { isTask: true, items: matchedTasks };
  }

  // Single markdown task "- [ ] task"
  if (lines.length === 1 && (markdownTaskRegex.test(lines[0]) || bracketTaskRegex.test(lines[0]))) {
    return { isTask: true, items: matchedTasks };
  }

  return { isTask: false };
}

// Formats a clean title from a URL
function extractDomainTitle(url) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "");
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = decodeURIComponent(pathParts[pathParts.length - 1])
        .replace(/[-_]/g, " ")
        .replace(/\.[a-z0-9]+$/i, "");
      if (lastPart.length > 2) {
        return `${lastPart.charAt(0).toUpperCase() + lastPart.slice(1)} (${host})`;
      }
    }
    return host;
  } catch (_) {
    return url;
  }
}

/**
 * Classify a string into a block type payload
 */
export function classifyText(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Single URL
  const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
  if (urlRegex.test(trimmed)) {
    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return {
      type: "links",
      url: fullUrl,
      title: extractDomainTitle(fullUrl),
      description: "",
      blockName: `Link: ${extractDomainTitle(fullUrl)}`,
    };
  }

  // 2. Checklist / Tasks
  const taskResult = isTaskList(trimmed);
  if (taskResult.isTask && taskResult.items.length > 0) {
    return {
      type: "todo",
      todos: taskResult.items.map((t, idx) => ({
        text: t.text,
        checked: t.checked,
        priority: "medium",
        order: idx,
      })),
      blockName: `Tasks (${taskResult.items.length} item${taskResult.items.length !== 1 ? "s" : ""})`,
    };
  }

  // 3. Code Snippet
  const codeResult = isCodeSnippet(trimmed);
  if (codeResult.isCode) {
    const langDisplay =
      codeResult.language.charAt(0).toUpperCase() + codeResult.language.slice(1);
    return {
      type: "snippet",
      code: codeResult.cleanCode,
      language: codeResult.language,
      blockName: `${langDisplay} Snippet`,
    };
  }

  // 4. Default: Note / Markdown
  const firstLine = trimmed.split("\n")[0].replace(/^#+\s*/, "").trim();
  const truncatedTitle =
    firstLine.length > 30 ? firstLine.slice(0, 30) + "…" : firstLine;
  return {
    type: "note",
    content: trimmed,
    blockName: truncatedTitle || "Pasted Note",
  };
}

/**
 * Main Classifier: Inspects native ClipboardEvent
 * @param {ClipboardEvent} event
 * @returns {Promise<Object|null>} classified payload
 */
export async function classifyClipboard(event) {
  if (!event || !event.clipboardData) return null;

  const { items, files } = event.clipboardData;

  // 1. Check for Image file or blob
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type && file.type.startsWith("image/")) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return {
        type: "image",
        file,
        previewUrl: URL.createObjectURL(file),
        blockName: `Screenshot - ${timeStr}`,
        imageCaption: `Pasted at ${timeStr}`,
      };
    }
  }

  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return {
            type: "image",
            file,
            previewUrl: URL.createObjectURL(file),
            blockName: `Screenshot - ${timeStr}`,
            imageCaption: `Pasted at ${timeStr}`,
          };
        }
      }
    }
  }

  // 2. Check for Text
  const text = event.clipboardData.getData("text/plain");
  if (text && text.trim()) {
    return classifyText(text);
  }

  return null;
}
