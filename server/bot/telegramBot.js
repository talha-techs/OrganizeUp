const tg = require("node-telegram-bot-api");
const TelegramBot = tg.default || tg;
const User = require("../models/User");
const TelegramMessage = require("../models/TelegramMessage");
const { uploadToGridFS } = require("../config/gridfs");

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

      // Process attached image if present
      let bannerImageId = null;
      console.log("DEBUG: msg.photo =", msg.photo ? "Exists" : "Undefined");
      console.log("DEBUG: extractedUrl =", extractedUrl);
      
      if (msg.photo && msg.photo.length > 0) {
        console.log("DEBUG: Entering msg.photo branch");
        try {
          const photo = msg.photo[msg.photo.length - 1]; // highest resolution
          const fileLink = await bot.getFileLink(photo.file_id);
          const response = await fetch(fileLink);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            bannerImageId = await uploadToGridFS(
              buffer,
              `telegram_${photo.file_id}.jpg`,
              "image/jpeg",
              "image"
            );
          }
        } catch (imgError) {
          console.error("Error processing telegram image:", imgError);
        }
      } else if (extractedUrl) {
        // Scrape OpenGraph image if no native photo is present
        try {
          console.log("Attempting to scrape OpenGraph image from:", extractedUrl);
          const response = await fetch(extractedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
          });
          
          if (response.ok) {
            const html = await response.text();
            // Match og:image or twitter:image
            const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || 
                            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
                            html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
            
            if (ogMatch && ogMatch[1]) {
              let ogImageUrl = ogMatch[1];
              console.log("Found OpenGraph image URL:", ogImageUrl);
              
              // Handle relative URLs
              if (ogImageUrl.startsWith('/')) {
                 const urlObj = new URL(extractedUrl);
                 ogImageUrl = `${urlObj.protocol}//${urlObj.host}${ogImageUrl}`;
              }
              
              const imgResponse = await fetch(ogImageUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
                }
              });
              
              if (imgResponse.ok) {
                console.log("Successfully downloaded image. Saving to GridFS...");
                const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
                const arrayBuffer = await imgResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                bannerImageId = await uploadToGridFS(
                  buffer,
                  `telegram_og_${Date.now()}.jpg`,
                  contentType,
                  "image"
                );
                console.log("Image saved with ID:", bannerImageId);
              } else {
                console.warn(`Failed to download image. Status: ${imgResponse.status}`);
              }
            } else {
              console.log("No og:image or twitter:image found in the HTML.");
            }
          } else {
            console.warn(`Failed to fetch URL for OpenGraph. Status: ${response.status}`);
          }
        } catch (ogError) {
          console.error("Error scraping OpenGraph image:", ogError.message);
        }
      }

      // Save to database
      await TelegramMessage.create({
        user: user._id,
        telegramMessageId: msg.message_id.toString(),
        text: text,
        extractedUrl: extractedUrl,
        senderName: senderName,
        bannerImageId: bannerImageId,
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
