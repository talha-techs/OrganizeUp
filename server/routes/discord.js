const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DiscordMessage = require('../models/DiscordMessage');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');

let gridfsBucket;
mongoose.connection.once('open', () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'discord_media',
  });
});

// @desc    Get user's Discord saved messages
// @route   GET /api/discord/messages
// @access  Private
router.get('/messages', protect, async (req, res) => {
  try {
    const messages = await DiscordMessage.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching discord messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Stream Discord media from GridFS
// @route   GET /api/discord/media/:id
// @access  Public (or semi-private if token provided in query)
router.get('/media/:id', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const files = await gridfsBucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = files[0];
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    
    const readStream = gridfsBucket.openDownloadStream(fileId);
    readStream.pipe(res);
  } catch (error) {
    console.error('Error streaming discord media:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get Discord Client ID
// @route   GET /api/discord/client-id
// @access  Public
router.get('/client-id', (req, res) => {
  res.json({ clientId: process.env.DISCORD_CLIENT_ID });
});

// @desc    OAuth2 Exchange & Link Discord Account
// @route   POST /api/discord/oauth
// @access  Private
router.post('/oauth', protect, async (req, res) => {
  const { code, redirectUri } = req.body;
  if (!code || !redirectUri) return res.status(400).json({ message: 'Code and redirectUri are required' });

  try {
    const data = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    });

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('Discord OAuth Token Error:', tokenData);
      return res.status(400).json({ message: 'Invalid or expired authorization code' });
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        authorization: `${tokenData.token_type} ${tokenData.access_token}`
      }
    });

    const userData = await userResponse.json();
    
    if (!userData.id) {
      return res.status(400).json({ message: 'Failed to fetch Discord user profile' });
    }

    const user = await User.findById(req.user._id);
    user.discordId = userData.id;
    await user.save();
    
    res.json({ message: 'Discord account linked successfully' });
  } catch (error) {
    console.error('Error in Discord OAuth flow:', error);
    res.status(500).json({ message: 'Server error during OAuth exchange' });
  }
});

// @desc    Unlink Discord Account
// @route   DELETE /api/discord/unlink
// @access  Private
router.delete('/unlink', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.discordId = undefined;
    await user.save();
    res.json({ message: 'Discord account unlinked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Check Discord Linking Status
// @route   GET /api/discord/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ isConnected: !!user.discordId, discordId: user.discordId });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update Discord Message Note
// @route   PUT /api/discord/messages/:id/note
// @access  Private
router.put('/messages/:id/note', protect, async (req, res) => {
  try {
    const { note } = req.body;
    const msg = await DiscordMessage.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { note },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete Discord Message
// @route   DELETE /api/discord/messages/:id
// @access  Private
router.delete('/messages/:id', protect, async (req, res) => {
  try {
    const msg = await DiscordMessage.findOne({ _id: req.params.id, user: req.user._id });
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    
    // Optionally delete files from GridFS
    for (const media of msg.media) {
      if (media.gridFsId) {
        try {
          await gridfsBucket.delete(new mongoose.Types.ObjectId(media.gridFsId));
        } catch(err) {
          console.error("Failed to delete media from gridfs", err);
        }
      }
    }

    await msg.deleteOne();
    res.json({ message: 'Message removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
