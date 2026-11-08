const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      maxlength: 80,
      trim: true,
      default: "Untitled note",
    },
    body: {
      type: String,
      default: "",
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    isScratchpad: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
      set: (val) => {
        if (!Array.isArray(val)) return [];
        return [
          ...new Set(
            val
              .map((t) =>
                String(t)
                  .toLowerCase()
                  .trim()
                  .replace(/^#/, "")
              )
              .filter(Boolean)
          ),
        ].slice(0, 20);
      },
    },
    linkedTo: {
      type: {
        type: String,
        enum: ["book", "course", "playlist", "capture"],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    clientId: {
      type: String,
      trim: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    bodyBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes specified by quick-notes-spec:
// 1. Primary list index: { user: 1, deletedAt: 1, updatedAt: -1 }
noteSchema.index({ user: 1, deletedAt: 1, updatedAt: -1 });

// 2. Unique partial index on user + clientId for idempotent creation
noteSchema.index(
  { user: 1, clientId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientId: { $type: "string" } },
  }
);

// 4. Unique partial index on user for isScratchpad
noteSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { isScratchpad: true },
  }
);

// 5. Lookup index on linkedTo
noteSchema.index({ "linkedTo.type": 1, "linkedTo.id": 1 });

// 6. User storage quota index on bodyBytes
noteSchema.index({ user: 1, bodyBytes: 1 });

// Auto-derive title from first non-empty line of body if title is empty or "Untitled note"
noteSchema.pre("validate", function () {
  this.bodyBytes = this.body ? Buffer.byteLength(String(this.body), "utf8") : 0;

  if (this.body && (!this.title || this.title === "Untitled note")) {
    const firstNonEmptyLine = this.body
      .split("\n")
      .map((l) => l.trim().replace(/^#+\s*/, "")) // strip leading markdown heading hashes
      .find((l) => l.length > 0);

    if (firstNonEmptyLine) {
      this.title = firstNonEmptyLine.slice(0, 80);
    } else {
      this.title = "Untitled note";
    }
  } else if (!this.title) {
    this.title = "Untitled note";
  }

  // Ensure body does not exceed 50 KB (51,200 bytes)
  if (this.bodyBytes > 51200) {
    const err = new Error("Note content exceeds the 50 KB limit.");
    err.name = "ValidationError";
    throw err;
  }
});

// Set bodyBytes in pre-save hook
noteSchema.pre("save", function () {
  this.bodyBytes = this.body ? Buffer.byteLength(String(this.body), "utf8") : 0;
});

module.exports = mongoose.model("Note", noteSchema);
