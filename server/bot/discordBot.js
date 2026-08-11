const { Client, GatewayIntentBits, Partials, ApplicationCommandType, ContextMenuCommandBuilder, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const User = require('../models/User');
const DiscordMessage = require('../models/DiscordMessage');
const { Readable } = require('stream');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

let gridfsBucket;
mongoose.connection.once('open', () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'discord_media',
  });
});

async function uploadToGridFS(buffer, filename, contentType) {
  return new Promise((resolve, reject) => {
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    const uploadStream = gridfsBucket.openUploadStream(filename, {
      contentType: contentType,
    });
    readableStream.pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });
}

// Extract URLs from text
function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.on('ready', () => {
  console.log(`🤖 Discord Bot logged in as ${client.user.tag}`);
  
  // Register Context Menu Command for User Apps globally
  if (DISCORD_TOKEN && DISCORD_CLIENT_ID) {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    const command = new ContextMenuCommandBuilder()
      .setName('Save to OrganizeUp')
      .setType(ApplicationCommandType.Message)
      .setIntegrationTypes([0, 1]) // 0 = GUILD_INSTALL, 1 = USER_INSTALL
      .setContexts([0, 1, 2]); // 0 = GUILD, 1 = BOT_DM, 2 = PRIVATE_CHANNEL

    rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: [command.toJSON()] })
      .then(() => console.log('Successfully registered OrganizeUp context menu command.'))
      .catch(console.error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isMessageContextMenuCommand()) return;
  if (interaction.commandName !== 'Save to OrganizeUp') return;

  await interaction.deferReply({ ephemeral: true });

  try {
    const targetMessage = interaction.targetMessage;
    const discordId = interaction.user.id;

    // 1. Find user in OrganizeUp DB
    const user = await User.findOne({ discordId });
    if (!user) {
      return interaction.editReply({ 
        content: `❌ Your Discord account is not linked to OrganizeUp. Please log into OrganizeUp, go to your Profile or Discord Library, and link your account!` 
      });
    }

    // 2. Parse the message
    let text = targetMessage.content || "";
    let extractedUrls = extractUrls(text);
    let authorName = targetMessage.author ? targetMessage.author.tag : "Unknown";
    let guildName = interaction.guild ? interaction.guild.name : "Direct Message";
    
    // Create the message document data
    const messageData = {
      user: user._id,
      discordMessageId: targetMessage.id,
      guildId: interaction.guildId || "@me",
      guildName: guildName,
      channelId: interaction.channelId,
      text: text,
      authorName: authorName,
      extractedUrls: extractedUrls,
      media: [],
      videoLink: null,
      note: ""
    };

    let hasVideo = false;

    // 3. Process Attachments
    if (targetMessage.attachments && targetMessage.attachments.size > 0) {
      for (const [id, attachment] of targetMessage.attachments) {
        const contentType = attachment.contentType || "";
        
        // Check for video (USER REQUEST: Do not download videos)
        if (contentType.startsWith("video/")) {
          hasVideo = true;
          // Set a link to jump directly to the message in Discord
          const guildIdForLink = interaction.guildId || "@me";
          messageData.videoLink = `https://discord.com/channels/${guildIdForLink}/${interaction.channelId}/${targetMessage.id}`;
          continue; // Skip downloading video
        }

        // Process images or other safe files
        if (contentType.startsWith("image/")) {
          try {
            console.log(`Downloading Discord image: ${attachment.url}`);
            const response = await fetch(attachment.url);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const gridFsId = await uploadToGridFS(buffer, attachment.name || `discord_img_${Date.now()}.jpg`, contentType);
              
              messageData.media.push({
                gridFsId: gridFsId.toString(),
                type: contentType,
                filename: attachment.name
              });
            }
          } catch (err) {
            console.error("Failed to download discord attachment", err);
          }
        }
      }
    }

    if (hasVideo) {
      messageData.note = "This message contains video - see directly there.";
    }

    const newMessage = new DiscordMessage(messageData);
    await newMessage.save();

    await interaction.editReply({ 
      content: `✅ Successfully saved to your OrganizeUp Discord Library!` 
    });

  } catch (error) {
    console.error("Error processing discord context command:", error);
    await interaction.editReply({ content: '❌ An error occurred while saving the message.' }).catch(()=>console.log("interaction expired"));
  }
});

// Initialize bot if token exists
const initDiscordBot = () => {
  if (DISCORD_TOKEN) {
    client.login(DISCORD_TOKEN).catch(err => console.error("Discord login failed:", err));
  } else {
    console.log("No DISCORD_TOKEN provided, skipping discord bot initialization.");
  }
};

module.exports = { initDiscordBot, client };
