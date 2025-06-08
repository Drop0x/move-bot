require("dotenv").config();
const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const express = require("express");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

let config = {};
const CONFIG_FILE = './config.json';

if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE));
}

function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

client.on("messageCreate", async message => {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;

    if (!config[guildId]) {
        config[guildId] = {
            prefix: "!",
            moveRole: null,
            logChannel: null
        };
        saveConfig();
    }

    const { prefix, moveRole, logChannel } = config[guildId];
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(" ");
    const cmd = args.shift().toLowerCase();

    if (cmd === "setprefix" && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const newPrefix = args[0];
        if (!newPrefix) return message.reply("عطيني بريفكس جديد (مثال: `setprefix !`)");
        config[guildId].prefix = newPrefix;
        saveConfig();
        return message.reply(`✅ تم تغيير البريفكس لـ: \`${newPrefix}\``);
    }

    if (cmd === "setrole" && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const role = message.mentions.roles.first();
        if (!role) return message.reply("منشن رول صحيح.");
        config[guildId].moveRole = role.id;
        saveConfig();
        return message.reply(`✅ تم تحديد رول Move Power: ${role.name}`);
    }

    if (cmd === "setlog" && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const channel = message.mentions.channels.first();
        if (!channel || !channel.isTextBased()) return message.reply("منشن شانيل كتابي.");
        config[guildId].logChannel = channel.id;
        saveConfig();
        return message.reply(`✅ تم تحديد شانيل اللوج: ${channel.name}`);
    }

    if (cmd === "move") {
        if (!moveRole || !logChannel) {
            return message.reply(`⚠️ خاصك تدير \`${prefix}setrole\` و \`${prefix}setlog\` قبل.`);
        }

        if (!message.member.roles.cache.has(moveRole)) {
            return message.reply("🚫 ما عندكش صلاحية الموف.");
        }

        const member = message.mentions.members.first();
        const voiceChannel = message.mentions.channels.find(ch => ch.isVoiceBased?.());

        if (!member || !voiceChannel) {
            return message.reply(`استعمل: \`${prefix}move @user #voicechannel\``);
        }

        if (!member.voice.channel) {
            return message.reply("هاد العضو ماشي فـ voice channel.");
        }

        try {
            await member.voice.setChannel(voiceChannel);
            message.reply(`✅ تم تحريك ${member.user.tag} لـ ${voiceChannel.name}`);

            const logChan = message.guild.channels.cache.get(logChannel);
            if (logChan) {
                logChan.send(`🔁 ${message.author.tag} حرك ${member.user.tag} لـ ${voiceChannel.name}`);
            }
        } catch (err) {
            console.error(err);
            message.reply("❌ وقع خطأ فـ التحويل.");
        }
    }
});

// ====== Keep alive for Render ======
const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(process.env.PORT || 3000, () => {
    console.log("Web server running");
});

// ====== Bot login ======
client.login(process.env.BOT_TOKEN);
