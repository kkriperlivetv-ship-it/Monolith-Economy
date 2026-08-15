const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../database');
const { createEmbed } = require('../utils/embedBuilder');
const config = require('../config');

let robberyInterval;

function startRobberyInterval(client) {
    if (robberyInterval) clearInterval(robberyInterval);
    
    const interval = Math.random() * (config.ECONOMY.ROBBERY_MAX_INTERVAL - config.ECONOMY.ROBBERY_MIN_INTERVAL) + config.ECONOMY.ROBBERY_MIN_INTERVAL;
    
    robberyInterval = setInterval(async () => {
        await triggerRobbery(client);
    }, interval);
}

async function triggerRobbery(client) {
    const db = getDb();
    const users = await db.all('SELECT user_id, balance, last_robbery FROM users WHERE balance > 100000');
    
    if (users.length === 0) return;
    
    const now = Date.now();
    const eligible = users.filter(u => !u.last_robbery || now - u.last_robbery > config.ECONOMY.ROBBERY_COOLDOWN);
    
    if (eligible.length === 0) return;
    
    const target = eligible[Math.floor(Math.random() * eligible.length)];
    
    const member = await client.guilds.cache.first().members.fetch(target.user_id).catch(() => null);
    if (!member) return;
    
    const status = member.presence?.status;
    if (status === 'offline') return;
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('robbery_pay').setLabel('💰 Заплатить 15000').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('robbery_fight').setLabel('⚔️ Сражаться').setStyle(ButtonStyle.Primary)
        );
    
    await member.send({
        embeds: [createEmbed('🧟‍♂️ На вас напали грабители!', [
            { name: 'Выберите действие', value: 'Заплатить 15,000 экзпоинтов или сразиться с ботом', inline: false }
        ], 0xff4444)],
        components: [row]
    }).catch(() => {});
    
    await db.run('UPDATE users SET last_robbery = ? WHERE user_id = ?', now, target.user_id);
    
    setTimeout(async () => {
        await db.run('UPDATE users SET last_robbery = NULL WHERE user_id = ? AND last_robbery = ?', target.user_id, now);
    }, 5 * 60 * 1000);
}

async function robberyPay(client, interaction) {
    const db = getDb();
    const user = await db.get('SELECT balance FROM users WHERE user_id = ?', interaction.user.id);
    
    if (!user || user.balance < 15000) {
        return interaction.reply({
            embeds: [createEmbed('❌ Ошибка', [{ name: '', value: 'Недостаточно средств, чтобы заплатить!', inline: false }], 0xff0000)],
            ephemeral: true
        });
    }
    
    await db.run('UPDATE users SET balance = balance - 15000 WHERE user_id = ?', interaction.user.id);
    
    await interaction.update({
        embeds: [createEmbed('💰 Вы заплатили грабителям', [
            { name: 'Сумма', value: '-15,000 экзпоинтов', inline: true },
            { name: 'Новый баланс', value: `${user.balance - 15000} экзпоинтов`, inline: true }
        ], 0xffaa00)],
        components: []
    });
}

async function robberyFight(client, interaction) {
    const db = getDb();
    const choices = ['камень', 'ножницы', 'бумага'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const userChoice = choices[Math.floor(Math.random() * choices.length)];
    
    let win = false;
    if (userChoice === botChoice) win = false;
    else if (
        (userChoice === 'камень' && botChoice === 'ножницы') ||
        (userChoice === 'ножницы' && botChoice === 'бумага') ||
        (userChoice === 'бумага' && botChoice === 'камень')
    ) win = true;
    
    if (win) {
        await db.run('UPDATE users SET balance = balance + 50000 WHERE user_id = ?', interaction.user.id);
        const user = await db.get('SELECT balance FROM users WHERE user_id = ?', interaction.user.id);
        await interaction.update({
            embeds: [createEmbed('⚔️ Победа!', [
                { name: 'Ваш ход', value: userChoice, inline: true },
                { name: 'Ход грабителей', value: botChoice, inline: true },
                { name: 'Награда', value: '+50,000 экзпоинтов', inline: true },
                { name: 'Новый баланс', value: `${user.balance} экзпоинтов`, inline: true }
            ], 0x00ff00)],
            components: []
        });
    } else {
        await db.run('UPDATE users SET balance = balance - 30000 WHERE user_id = ?', interaction.user.id);
        const user = await db.get('SELECT balance FROM users WHERE user_id = ?', interaction.user.id);
        await interaction.update({
            embeds: [createEmbed('⚔️ Поражение', [
                { name: 'Ваш ход', value: userChoice, inline: true },
                { name: 'Ход грабителей', value: botChoice, inline: true },
                { name: 'Штраф', value: '-30,000 экзпоинтов', inline: true },
                { name: 'Новый баланс', value: `${user.balance} экзпоинтов`, inline: true }
            ], 0xff0000)],
            components: []
        });
    }
}

module.exports = { startRobberyInterval, robberyPay, robberyFight };