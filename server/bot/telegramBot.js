const tg = require("node-telegram-bot-api");
const TelegramBot = tg.default || tg;
const User = require("../models/User");
const TelegramMessage = require("../models/TelegramMessage");

let bot;

const initTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN not provided. Bot is disabled.");
    return;
  }

  // Create a bot that uses 'polling' to fetch new updates
  bot = new TelegramBot(token, { polling: true });

  console.log("🤖 Telegram Bot initialized and polling...");

  // Handle /start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      "Welcome to OrganizeUp Bot! 📚\n\nTo link your account, go to OrganizeUp > Telegram Inbox and generate a link code. Then send me the code in this format: #link-123456"
    );
  });

  // Handle linking code format: #link-xxxxxx
  bot.onText(/#link-(\w+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const linkCode = match[1];

    try {
      const user = await User.findOne({
        telegramLinkCode: linkCode,
        telegramLinkCodeExpires: { $gt: Date.now() },
      });

      if (!user) {
        return bot.sendMessage(
          chatId,
          "❌ Invalid or expired link code. Please generate a new one in OrganizeUp."
        );
      }

      // Link the account
      user.telegramId = chatId;
      user.telegramLinkCode = null;
      user.telegramLinkCodeExpires = null;
      await user.save();

      bot.sendMessage(
        chatId,
        "✅ Success! Your OrganizeUp account is now linked. You can now forward messages with links to me, and I will save them to your OrganizeUp Inbox!"
      );
    } catch (error) {
      console.error("Telegram bot link error:", error);
      bot.sendMessage(chatId, "⚠️ Server error while linking account.");
    }
  });

  // Handle forwarded messages (or any text messages)
  bot.on("message", async (msg) => {
    // Ignore commands and link codes
    if (msg.text && (msg.text.startsWith("/") || msg.text.startsWith("#link-"))) {
      return;
    }

    const chatId = msg.chat.id.toString();

    try {
      // Check if user is linked
      const user = await User.findOne({ telegramId: chatId });
      
      if (!user) {
        return bot.sendMessage(
          chatId,
          "❌ Your account is not linked. Please send a valid link code from OrganizeUp."
        );
      }

      const text = msg.text || msg.caption;
      if (!text) {
        return bot.sendMessage(
          chatId,
          "⚠️ I can only save text messages or media with captions containing text/links."
        );
      }

      // Extract a URL using regex
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = text.match(urlRegex);
      const extractedUrl = urls ? urls[0] : "";

      // Determine sender name (from forwarded message or current user)
      let senderName = "Unknown";
      if (msg.forward_from_chat) {
        senderName = msg.forward_from_chat.title || msg.forward_from_chat.username || "Unknown Channel";
      } else if (msg.forward_from) {
        senderName = msg.forward_from.first_name || msg.forward_from.username || "Unknown User";
      } else if (msg.forward_sender_name) {
        senderName = msg.forward_sender_name;
      } else {
        senderName = msg.chat.first_name || msg.chat.username || "You";
      }

      // Save to database
      await TelegramMessage.create({
        user: user._id,
        telegramMessageId: msg.message_id.toString(),
        text: text,
        extractedUrl: extractedUrl,
        senderName: senderName,
        status: "saved",
      });

      bot.sendMessage(
        chatId,
        "✅ Saved to your OrganizeUp Telegram Library!"
      );
    } catch (error) {
      console.error("Telegram message handle error:", error);
      bot.sendMessage(chatId, "⚠️ Failed to save message. Please try again later.");
    }
  });
};

module.exports = { initTelegramBot };
