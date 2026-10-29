require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  AttachmentBuilder,
  Events,
  PermissionFlagsBits
} = require('discord.js');

const config = require('./config.json');

const NOTICES_FILE = path.resolve(__dirname, 'notices.json');

function loadNotices() {
  if (fs.existsSync(NOTICES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(NOTICES_FILE, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveNotices(notices) {
  try {
    fs.writeFileSync(NOTICES_FILE, JSON.stringify(notices, null, 2));
  } catch (err) {
    console.error('Failed to save notices:', err);
  }
}

// Initialize Discord Client with disabled retries to prevent duplicate message sends
const client = new Client({
  rest: {
    timeout: 60000,
    retries: 0
  },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.MessageContent, // Required to detect messages in trap channel
    GatewayIntentBits.GuildMembers     // Required to moderate and timeout members
  ]
});

let currentWarningMessageId = null;
let isEnsuringWarning = false;

/**
 * Clean up notices that have exceeded their 6-hour duration
 */
async function cleanExpiredNotices() {
  const notices = loadNotices();
  const now = Date.now();
  const remaining = [];

  for (const item of notices) {
    if (now >= item.expiresAt) {
      try {
        const ch = await client.channels.fetch(item.channelId).catch(() => null);
        if (ch) {
          const msg = await ch.messages.fetch(item.messageId).catch(() => null);
          if (msg) await msg.delete().catch(() => {});
        }
      } catch {}
    } else {
      remaining.push(item);
      const delay = item.expiresAt - now;
      setTimeout(async () => {
        try {
          const ch = await client.channels.fetch(item.channelId).catch(() => null);
          if (ch) {
            const msg = await ch.messages.fetch(item.messageId).catch(() => null);
            if (msg) await msg.delete().catch(() => {});
          }
          const cur = loadNotices().filter((n) => n.messageId !== item.messageId);
          saveNotices(cur);
        } catch {}
      }, delay);
    }
  }
  saveNotices(remaining);
}

/**
 * Builds the official Trap Warning embed and file attachment
 */
function buildWarningPayload() {
  const localGif = path.resolve(__dirname, config.embed.localGifPath);
  const files = [];

  const embed = new EmbedBuilder()
    .setColor(config.embed.color || '#ff1744')
    .setTitle(config.embed.title)
    .setDescription(config.embed.description)
    .setFooter({ text: config.embed.footerText || 'NOVYRA DEFENDER • AUTOMATED SECURITY' })
    .setTimestamp();

  if (fs.existsSync(localGif)) {
    const attachment = new AttachmentBuilder(localGif, { name: 'warning.gif' });
    files.push(attachment);
    embed.setImage('attachment://warning.gif');
  }

  return {
    embeds: [embed],
    files: files
  };
}

/**
 * Ensures exactly ONE permanent warning message exists in the trap channel
 */
async function ensureWarningMessage() {
  if (isEnsuringWarning) return;
  isEnsuringWarning = true;

  const channelId = config.trapChannelId;
  if (!channelId || channelId === 'YOUR_TRAP_CHANNEL_ID_HERE') {
    console.warn('[DEFENDER] trapChannelId is not configured in config.json!');
    isEnsuringWarning = false;
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      console.warn(`[DEFENDER] Trap channel ${channelId} not found!`);
      isEnsuringWarning = false;
      return;
    }

    // Fetch recent messages to check for bot warning messages
    const messages = await channel.messages.fetch({ limit: 50 });
    const botMessages = Array.from(
      messages
        .filter((m) => m.author.id === client.user.id && m.embeds.length > 0)
        .values()
    );

    // If there are duplicate bot warning messages, delete all extras immediately!
    if (botMessages.length > 1) {
      console.log(`🛡️ [DEFENDER] Found ${botMessages.length} warning messages. Cleaning up duplicates...`);
      for (let i = 1; i < botMessages.length; i++) {
        await botMessages[i].delete().catch(() => {});
      }
    }

    const existingMsg = botMessages[0] || null;

    if (existingMsg) {
      currentWarningMessageId = existingMsg.id;
      const currentTitle = existingMsg.embeds[0]?.title;
      // If title or embed doesn't match new config, replace it
      if (currentTitle !== config.embed.title) {
        console.log(`🛡️ [DEFENDER] Title updated. Replacing old warning message...`);
        await existingMsg.delete().catch(() => {});
        currentWarningMessageId = null;
        const payload = buildWarningPayload();
        const sent = await channel.send(payload);
        currentWarningMessageId = sent.id;
        await sent.pin().catch(() => {});
        console.log(`✅ [DEFENDER] Fresh single warning message posted and pinned!`);
      } else {
        console.log(`🛡️ [DEFENDER] Verified exactly 1 active warning message in #${channel.name} (ID: ${existingMsg.id})`);
      }
    } else {
      console.log(`🛡️ [DEFENDER] Warning message not found in #${channel.name}. Sending new warning card...`);
      const payload = buildWarningPayload();
      const sent = await channel.send(payload);
      currentWarningMessageId = sent.id;
      await sent.pin().catch(() => {});
      console.log(`✅ [DEFENDER] Permanent single warning message posted and pinned in #${channel.name}!`);
    }
  } catch (err) {
    console.error('[DEFENDER ERROR] Failed to ensure warning message:', err);
  } finally {
    isEnsuringWarning = false;
  }
}

// Client Ready
client.once(Events.ClientReady, async (readyClient) => {
  console.log('====================================================');
  console.log(`🛡️ Logged in as: ${readyClient.user.tag}`);
  console.log(`🏰 Monitoring in ${readyClient.guilds.cache.size} server(s)`);
  console.log(`⚡ NOVYRA DEFENDER - ANTI-SCAM TRAP IS ACTIVE!`);
  console.log('====================================================');

  readyClient.user.setActivity('Trap Channel | Anti-Scam', { type: 3 }); // Watching Trap Channel

  await ensureWarningMessage();
  await cleanExpiredNotices();

  // Run cleanup every 10 minutes
  setInterval(cleanExpiredNotices, 600000);
});

// Auto-restore warning message if it ever gets deleted
client.on(Events.MessageDelete, async (deletedMessage) => {
  if (deletedMessage.channelId === config.trapChannelId && currentWarningMessageId && deletedMessage.id === currentWarningMessageId) {
    if (isEnsuringWarning) return;
    console.warn('⚠️ [DEFENDER ALERT] Trap warning message was deleted! Auto-restoring immediately...');
    currentWarningMessageId = null;
    await ensureWarningMessage();
  }
});

// When bot is added to server, immediately setup trap channel
client.on(Events.GuildCreate, async (guild) => {
  console.log(`🏰 [JOINED SERVER] Joined ${guild.name} (${guild.id})! Initializing trap channel...`);
  await ensureWarningMessage();
});

// Trap Channel Sentinel: Triggers when ANY message is sent
client.on(Events.MessageCreate, async (message) => {
  // Ignore messages from this bot itself so warning message isn't deleted
  if (message.author.id === client.user.id) return;

  // Only monitor the configured Trap Channel
  if (message.channelId !== config.trapChannelId) return;

  console.log(`🚨 [TRAP TRIGGERED] Message detected in #${message.channel.name} from ${message.author.tag} (${message.author.id})`);

  // 1. Immediately delete the message / link / image
  try {
    await message.delete();
    console.log(`🗑️ [DEFENDER DELETED] Message from ${message.author.tag} removed instantly.`);
  } catch (err) {
    console.error(`❌ [DELETE FAILED] Could not delete message from ${message.author.tag}:`, err.message);
  }

  // 2. Fetch Guild Member
  let member = message.member;
  if (!member && message.guild) {
    member = await message.guild.members.fetch(message.author.id).catch(() => null);
  }

  if (!member) {
    console.warn(`[DEFENDER] Could not fetch member ${message.author.id}`);
    return;
  }

  // Check Admin bypass if configured
  if (config.ignoreAdmins && member.permissions.has(PermissionFlagsBits.Administrator)) {
    console.log(`[DEFENDER BYPASS] ${message.author.tag} is Administrator. Skipping timeout.`);
    return;
  }

  // 3. Apply 6-Hour Timeout
  const timeoutMs = (config.timeoutHours || 6) * 60 * 60 * 1000;
  const reason = 'Novyra Defender: Sent message in anti-scam trap channel';

  if (member.moderatable) {
    try {
      await member.timeout(timeoutMs, reason);
      console.log(`⏱️ [DEFENDER TIMEOUT] Successfully timed out ${member.user.tag} for ${config.timeoutHours || 6} HOURS!`);

      // 4. Send Channel Notification mentioning the user
      if (config.timeoutNotice) {
        try {
          const noticeMsg = await message.channel.send({
            content: `<@${member.id}> ${config.timeoutNotice}`
          });
          console.log(`📢 [DEFENDER NOTICE] Sent timeout notice mentioning ${member.user.tag} in #${message.channel.name}`);

          // Delete notice after 6 hours (matches timeout duration)
          const deleteDelayHours = config.noticeAutoDeleteHours || config.timeoutHours || 6;
          const deleteDelayMs = deleteDelayHours * 60 * 60 * 1000;
          const expiresAt = Date.now() + deleteDelayMs;

          const notices = loadNotices();
          notices.push({ messageId: noticeMsg.id, channelId: noticeMsg.channelId, expiresAt });
          saveNotices(notices);

          setTimeout(async () => {
            await noticeMsg.delete().catch(() => {});
            const cur = loadNotices().filter((n) => n.messageId !== noticeMsg.id);
            saveNotices(cur);
          }, deleteDelayMs);
        } catch (noticeErr) {
          console.error(`❌ [NOTICE FAILED] Could not send channel notice:`, noticeErr.message);
        }
      }

      // 5. Send DM notification
      if (config.sendDMOnTimeout && !message.author.bot) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor('#ff1744')
            .setTitle(config.dmMessage.title)
            .setDescription(config.dmMessage.description)
            .setFooter({ text: 'Novyra Defender Security' })
            .setTimestamp();

          await message.author.send({ embeds: [dmEmbed] });
          console.log(`📩 [DEFENDER DM] Sent timeout notice to ${member.user.tag}`);
        } catch {
          console.log(`[DEFENDER DM] Could not DM ${member.user.tag} (DMs closed).`);
        }
      }
    } catch (err) {
      console.error(`❌ [TIMEOUT FAILED] Could not timeout ${member.user.tag}:`, err.message);
    }
  } else {
    console.warn(`⚠️ [CANNOT TIMEOUT] Bot cannot moderate ${member.user.tag}! Please make sure the Bot Role is higher than the member's role and has "Moderate Members" permission.`);
  }
});

// Login Bot
const token = process.env.DISCORD_TOKEN;
if (!token || token.trim() === '' || token === 'your_bot_token_here') {
  console.log('========================================================================');
  console.log('⚠️  DISCORD_TOKEN is missing!');
  console.log('   Please add your Bot Token into the .env file in NOVYRA DEFENDER.');
  console.log('   Get your token from: https://discord.com/developers/applications');
  console.log('========================================================================');
} else {
  client.login(token).catch((err) => {
    console.error('❌ Failed to login to Discord:', err.message);
  });
}
