# 🛡️ NOVYRA DEFENDER - Honeypot Trap & Anti-Scam Security Bot

A specialized, automated Discord security bot designed for **Novyra Roleplay** to trap, mute, and neutralize compromised accounts, phishing bots, and scam link distributors instantly.

---

## ✨ Features

- 🍯 **Honeypot Trap Channel:** Continuously monitors a dedicated honeypot channel. Any message sent in this channel immediately triggers security actions.
- ⏱️ **Instant Member Timeout:** Automatically times out the offending user (default: 6 hours) to prevent them from posting scam links across other channels.
- 🗑️ **Auto Message Deletion:** Instantly purges the spam/scam message from the channel so other members cannot click phishing links.
- 📌 **Sticky Warning Banner:** Automatically maintains an attention-grabbing warning embed (with local GIF attachment `warning.gif`) at the bottom of the trap channel.
- 📩 **Direct Message Notice:** Sends an informative DM to the timed-out user explaining the reason for the timeout and instructions on how to contact staff if their account was compromised or if it was an accident.
- 🧹 **Automatic Notice Cleanup:** Temporary trap notices posted in the channel are tracked and automatically purged when their expiration time arrives.
- ⚡ **Anti-Spam & Rate-Limit Safe:** Configured with disabled HTTP retries to eliminate duplicate API requests during latency spikes.

---

## 📋 Prerequisites

Before setting up the bot, ensure you have:
- [Node.js](https://nodejs.org/) **v18.0.0 or higher** installed on your system.
- A Discord account with administrative permissions on your server.
- Developer Mode enabled in Discord (Settings ➡️ Advanced ➡️ Developer Mode).

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Clone or Download the Repository
Clone the repository or download the folder to your computer or server:
```bash
git clone https://github.com/<your-username>/novyra-defender.git
cd novyra-defender
```

Install the required Node.js dependencies:
```bash
npm install
```

---

### Step 2: Create a Discord Bot in Developer Portal
1. Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** in the top right corner and enter a name (e.g., `Novyra Defender`).
3. In the left sidebar, click on the **Bot** tab.
4. Scroll down to **Privileged Gateway Intents** and enable both:
   - ✅ **Server Members Intent** *(Required to identify and timeout server members)*
   - ✅ **Message Content Intent** *(Required to read messages in the trap channel)*
5. Click **Reset Token**, enter your 2FA code if prompted, and **Copy** the generated Bot Token. Keep this safe!

---

### Step 3: Invite the Bot to Your Server
1. In the Developer Portal left sidebar, navigate to **OAuth2** ➡️ **URL Generator**.
2. Under **Scopes**, select:
   - `bot`
3. Under **Bot Permissions**, select:
   - `Moderate Members` *(Required for timeouts)*
   - `Manage Messages` *(Required to delete scam messages)*
   - `Send Messages`
   - `Embed Links`
   - `Attach Files`
   - `View Channels`
   - `Read Message History`
4. Copy the generated URL at the bottom of the page, open it in your browser, and invite the bot to your Discord server.

> [!IMPORTANT]
> ### Critical Step: Role Hierarchy
> Discord's permission system prevents bots from moderating users whose highest role is higher than or equal to the bot's highest role.
> 1. Go to your **Server Settings** ➡️ **Roles**.
> 2. Drag the **Novyra Defender** role to the top of the role list (above all regular member, verified, and community roles).
> 3. If the bot's role is below members, the bot will fail to timeout users and log a `CANNOT TIMEOUT` warning.

---

### Step 4: Configure Environment Variables (`.env`)
Create a `.env` file in the root directory (or rename `.env.example` to `.env`):

```env
# Discord Bot Credentials for NOVYRA DEFENDER
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_discord_server_id_here
```

Replace:
- `your_bot_token_here`: The Bot Token copied from Step 2.
- `your_bot_client_id_here`: The Application ID from Developer Portal (General Information tab).
- `your_discord_server_id_here`: Your Discord Server ID (Right-click server name ➡️ Copy Server ID).

---

### Step 5: Configure Bot Settings (`config.json`)
Open `config.json` and configure your trap channel and preferences:

```json
{
  "trapChannelId": "YOUR_TRAP_CHANNEL_ID_HERE",
  "timeoutHours": 6,
  "ignoreAdmins": false,
  "sendDMOnTimeout": true,
  "timeoutNotice": "You have been timed out for sending multiple messages in this channel. Our spam protection system detected your messages as potential spam. If you believe this timeout was issued by mistake, please contact the staff team for assistance.",
  "noticeAutoDeleteHours": 6,

  "embed": {
    "color": "#ff1744",
    "title": "👑 DO NOT SEND ANY MESSAGES IN THIS CHANNEL!",
    "description": "`If you send a message here, you will instantly get a 6-hour timeout. This channel is a trap to automatically catch and mute hacked accounts that are sending scam links or images.`",
    "footerText": "NOVYRA DEFENDER • AUTOMATED SECURITY SYSTEM",
    "localGifPath": "./assets/warning.gif"
  },

  "dmMessage": {
    "title": "⚠️ You have been timed out in Novyra Roleplay",
    "description": "You have been timed out for sending multiple messages in this channel. Our spam protection system detected your messages as potential spam. If you believe this timeout was issued by mistake, please contact the staff team for assistance."
  }
}
```

#### Configuration Breakdown:
| Parameter | Type | Description |
|---|---|---|
| `trapChannelId` | `string` | The ID of the trap channel. Right-click the channel in Discord ➡️ Copy Channel ID. |
| `timeoutHours` | `number` | Duration of the timeout in hours (e.g., `6` for 6 hours). |
| `ignoreAdmins` | `boolean` | Set to `false` to trap everyone, or `true` to exclude administrators. |
| `sendDMOnTimeout` | `boolean` | Whether to send a private DM to the timed-out user. |
| `noticeAutoDeleteHours` | `number` | How long temporary warning messages remain in the channel before auto-deletion. |
| `embed.localGifPath` | `string` | Path to the local warning GIF displayed in the channel banner. |

---

### Step 6: Start the Bot

- **Windows (1-Click):**
  Double-click `run.bat` in the folder.

- **Terminal / Linux / Mac / VPS:**
  ```bash
  npm start
  ```

When the bot connects successfully, you will see:
```text
==================================================
🛡️ NOVYRA DEFENDER is active and defending the server!
📌 Ensuring warning message in trap channel...
==================================================
```

---

## 📁 File Structure

```text
NOVYRA DEFENDER/
├── assets/
│   └── warning.gif          # Local warning banner GIF
├── config.json              # Channel IDs, timeout duration, and embed contents
├── notices.json             # Internal store for expiring channel alerts
├── .env                     # Private Bot Token & IDs (Excluded by .gitignore)
├── .env.example             # Clean template for environment variables
├── .gitignore               # Excludes secrets & node_modules from Git
├── index.js                 # Core honeypot security engine
├── run.bat                  # 1-Click batch runner for Windows
└── package.json             # Dependencies and project metadata
```

---

## ❓ Troubleshooting & FAQs

### 1. `DisallowedIntentsException` or `Used disallowed intents`
- **Fix:** Go to [Discord Developer Portal](https://discord.com/developers/applications) ➡️ Your App ➡️ **Bot** ➡️ Enable **Server Members Intent** and **Message Content Intent**.

### 2. `[CANNOT TIMEOUT] Bot cannot moderate <User>`
- **Fix:** Discord prevents bots from moderating members with higher roles. Move the Bot's role **higher** than the target user's roles in Server Settings ➡️ Roles.

### 3. `DISCORD_TOKEN is missing`
- **Fix:** Ensure you created a `.env` file with a valid `DISCORD_TOKEN=...`.

---

## 🔒 Security Notice
- **Never commit your `.env` file or bot tokens to GitHub or public repositories.**
- Keep `.gitignore` intact to protect your server credentials.

---

## 👑 Credits
Developed for **Novyra Roleplay** by **Team Novyra**.
