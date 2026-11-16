// Smart keyword mapping for habit auto-icon detection
export const KEYWORD_ICONS = [
  { keywords: ["sleep", "rest", "bed", "nap", "dream"], icon: "💤" },
  { keywords: ["eat", "meal", "food", "salad", "diet", "nutrition", "healthy", "breakfast", "lunch", "dinner"], icon: "🥗" },
  { keywords: ["water", "drink", "hydrate", "hydration", "fluid", "2l"], icon: "💧" },
  { keywords: ["social", "phone", "media", "screen", "instagram", "tiktok", "twitter", "youtube", "scroll"], icon: "📱" },
  { keywords: ["corn", "alcohol", "smoke", "smoking", "beer", "wine", "quit", "stop", "no", "avoid"], icon: "🚫" },
  { keywords: ["study", "learn", "course", "lecture", "class", "exam", "school"], icon: "📚" },
  { keywords: ["exercise", "gym", "workout", "fitness", "train", "lift", "weight", "weights", "pushup", "cardio"], icon: "🏋️" },
  { keywords: ["run", "jog", "running", "sprint"], icon: "🏃" },
  { keywords: ["read", "book", "reading", "pages", "novel", "article"], icon: "📖" },
  { keywords: ["journal", "write", "writing", "reflect", "reflection", "diary", "gratitude"], icon: "✍️" },
  { keywords: ["plan", "todo", "task", "tasks", "organize", "schedule", "tomorrow"], icon: "📋" },
  { keywords: ["code", "leetcode", "program", "programming", "dev", "develop", "software", "bug", "algorithm"], icon: "💻" },
  { keywords: ["pray", "namaz", "salah", "prayer", "mosque", "fajr", "maghrib", "isha", "dhuhr", "asr"], icon: "🕌" },
  { keywords: ["darood", "quran", "zikr", "dhikr", "dua", "hadith", "tasbeeh", "tasbih", "recite"], icon: "🤲" },
  { keywords: ["meditate", "mindfulness", "breathe", "breathing", "zen", "calm"], icon: "🧘" },
  { keywords: ["walk", "steps", "walking", "hike"], icon: "🚶" },
  { keywords: ["stretch", "yoga", "flexibility", "stretching"], icon: "🤸" },
  { keywords: ["money", "save", "saving", "budget", "finance", "invest"], icon: "💰" },
  { keywords: ["teeth", "brush", "floss", "hygiene", "dental"], icon: "🪥" },
  { keywords: ["shower", "bath", "cold shower", "cleanse"], icon: "🚿" },
  { keywords: ["sun", "morning", "wake", "early", "sunrise"], icon: "☀️" },
  { keywords: ["clean", "tidy", "room", "chores", "vacuum"], icon: "🧹" },
  { keywords: ["guitar", "piano", "music", "instrument", "practice"], icon: "🎸" },
  { keywords: ["target", "goal", "focus", "deep work"], icon: "🎯" },
];

export const detectHabitIcon = (name) => {
  if (!name) return "✨";
  const lower = name.toLowerCase();
  for (const item of KEYWORD_ICONS) {
    if (item.keywords.some((k) => lower.includes(k))) {
      return item.icon;
    }
  }
  return "✨";
};

export const COMMON_EMOJIS = [
  "💤", "🥗", "📱", "🚫", "💧", "💻", "🏋️", "📖", "✍️", "📋",
  "🕌", "🤲", "🏃", "🧘", "🚶", "🤸", "📚", "☀️", "💰", "🪥",
  "🚿", "🧹", "🎯", "🍎", "🚴", "🏊", "☕", "🌿", "🧠", "🔥"
];
