const config = require('../config');
const { createEmbed } = require('./embedBuilder');

async function logToChannel(client, channelName, title, fields, color = null) {
    const channel = client.channels.cache.find(c => c.name === channelName);
    if (!channel) {
        console.log(`Канал ${channelName} не найден`);
        return;
    }
    
    const embed = createEmbed(title, fields, color);
    await channel.send({ embeds: [embed] });
}

async function logEconomy(client, title, fields) {
    await logToChannel(client, config.CHANNELS.ECONOMY_LOGS, title, fields, config.EMBED_STYLE.INFO_COLOR);
}

async function logGift(client, title, fields) {
    await logToChannel(client, config.CHANNELS.GIFT_LOGS, title, fields, 0xff66cc);
}

async function logAdmin(client, title, fields) {
    await logToChannel(client, config.CHANNELS.ADMIN_LOGS, title, fields, config.EMBED_STYLE.WARNING_COLOR);
}

module.exports = { logEconomy, logGift, logAdmin };