const mongoose = require("mongoose");

const defaultHabits = [
  { name: "Sleep 7-8 hours", icon: "💤", order: 0 },
  { name: "Eat healthy meals", icon: "🥗", order: 1 },
  { name: "Social media ≤ 90min", icon: "📱", order: 2 },
  { name: "Drink 2L water", icon: "💧", order: 3 },
  { name: "Study ≥ 2 hours", icon: "💻", order: 4 },
  { name: "Exercise 30 minutes", icon: "🏋️", order: 5 },
  { name: "Read 30 minutes", icon: "📖", order: 6 },
  { name: "Journal & self-reflect", icon: "✍️", order: 7 },
  { name: "Plan tomorrow's tasks", icon: "📋", order: 8 },
  { name: "LeetCode Problem", icon: "💻", order: 9 },
];

const defaultWins = [
  { streak: 30, reward: "Cheat meal & favorite movie", notes: "First month consistency unlocked!" },
  { streak: 50, reward: "Buy a new book or game", notes: "50-day momentum!" },
  { streak: 75, reward: "Day trip / outing", notes: "75% of the century milestone!" },
  { streak: 100, reward: "New gadget or premium apparel", notes: "Triple digits club!" },
  { streak: 150, reward: "Spa / massage day or fine dining", notes: "Half a year consistency!" },
  { streak: 200, reward: "Special celebration dinner", notes: "200 days strong!" },
  { streak: 250, reward: "Weekend getaway trip", notes: "Unstoppable habit formation!" },
  { streak: 300, reward: "Major tech upgrade", notes: "Almost 1 full year!" },
  { streak: 365, reward: "Dream vacation celebration", notes: "Full year transformation complete!" },
];

const habitItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: "✨",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true, timestamps: true }
);

const winMilestoneSchema = new mongoose.Schema(
  {
    streak: {
      type: Number,
      required: true,
    },
    reward: {
      type: String,
      default: "",
      trim: true,
    },
    achievedDate: {
      type: String, // YYYY-MM-DD
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const habitProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    tagline: {
      type: String,
      default: "Progress not Perfection",
      trim: true,
    },
    habits: [habitItemSchema],
    columnOrder: {
      type: [String], // Array of habit _id strings for table column ordering
      default: [],
    },
    wins: [winMilestoneSchema],
  },
  { timestamps: true }
);

module.exports = {
  HabitProfile: mongoose.model("HabitProfile", habitProfileSchema),
  defaultHabits,
  defaultWins,
};
