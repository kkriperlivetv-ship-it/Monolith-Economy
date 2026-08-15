require('dotenv').config();

const clean = (val) => {
    if (!val || typeof val !== 'string') return undefined;
    const trimmed = val.trim().replace(/^["']|["']$/g, '');
    return trimmed.length > 0 ? trimmed : undefined;
};

module.exports = {
    TOKEN: clean(process.env.TOKEN || process.env.DISCORD_TOKEN || process.env.BOT_TOKEN),
    CLIENT_ID: clean(process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID || process.env.APPLICATION_ID),
    GUILD_ID: clean(process.env.GUILD_ID || process.env.DISCORD_GUILD_ID || process.env.SERVER_ID),
    
    ECONOMY: {
        MAX_BALANCE: 999999,
        MAX_TRANSFER: 50000,
        DAILY_SEND_LIMIT: 150000,
        DAILY_RECEIVE_LIMIT: 200000,
        MAX_GIFT: 30000,
        DAILY_GIFT_LIMIT: 2,
        DAILY_GIFT_RECEIVE_LIMIT: 100000,
        DUEL_MIN: 1000,
        DUEL_MAX: 50000,
        CASINO_COMMISSION: 0.05,
        LOTTERY_TICKET_PRICE: 100,
        LOTTERY_INTERVAL: 6 * 60 * 60 * 1000,
        ROBBERY_MIN_INTERVAL: 2 * 60 * 60 * 1000,
        ROBBERY_MAX_INTERVAL: 4 * 60 * 60 * 1000,
        ROBBERY_COOLDOWN: 6 * 60 * 60 * 1000,
        DAILY_BASE: 500,
        DAILY_STREAK_BONUS: 50
    },
    
    ACTIVITY: {
        MESSAGE_REWARD: 30,
        MESSAGE_LIMIT: 300,
        MESSAGE_THRESHOLD: 50,
        VOICE_REWARD: 20,
        VOICE_LIMIT: 200,
        VOICE_THRESHOLD: 10
    },

    LEVELS: {
        XP_PER_LEVEL: 1000,
        LEVEL_UP_REWARD: 1000,
        VOICE_XP_INTERVAL_MIN: 15,
        VOICE_XP_AMOUNT: 10,
        MESSAGE_XP_EVERY: 50,
        MESSAGE_XP_AMOUNT: 10
    },
    
    ROLES: {
        CREATE_COST: 150000,
        ICON_COST: 50000,
        COLOR_COST: 20000,
        RENAME_COST: 15000,
        SELL_BACK_PERCENT: 0.5,
        MODERATOR: '1536135136582565938'
    },
    
    CHANNELS: {
        ECONOMY_LOGS: 'экономика-логи',
        GIFT_LOGS: 'подарки',
        ADMIN_LOGS: 'админ-логи',
        PRIVATE_ROOM_PANEL: '1537811874748436581', // канал, в который отправляется панель управления комнатой
        PRIVATE_ROOM_CATEGORY: '1537811757270310912' // категория, в которой создаются личные комнаты
    },

    MARRIAGE: {
        PRICE: 2000,
        LOVE_CATEGORY: '1537163992055939134' // категория, в которой создаются любовные комнаты
    },
    
    EMBED_STYLE: {
        COLOR: 1711134,
        BANNER_URL: 'https://cdn.discordapp.com/attachments/1177311446800023626/1496901956294410291/2GxE5Kn.gif',
        SUCCESS_COLOR: 0x00ff00,
        ERROR_COLOR: 0xff0000,
        WARNING_COLOR: 0xffaa00,
        INFO_COLOR: 0x00aaff
    }
};