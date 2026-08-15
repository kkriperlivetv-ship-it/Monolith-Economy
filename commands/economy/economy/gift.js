const { SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../../../database');
const { renderGift, sendImageEmbed } = require('../../../utils/imageGenerator');
const { logGift } = require('../../../utils/logger');
const { distributeCommission } = require('../../../utils/commissionHandler');
const config = require('../../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gift')
        .setDescription('Отправить подарок с красивым сообщением')
        .addUserOption(option => option.setName('user').setDescription('Получатель').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Сумма').setRequired(true).setMinValue(1))
        .addStringOption(option => option.setName('message').setDescription('Сообщение к подарку').setRequired(false)),
    
    async execute(client, interaction) {
        await interaction.deferReply();
        
        try {
            const senderId = interaction.user.id;
            const receiver = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const message = interaction.options.getString('message') || 'Подарок!';
            
            if (receiver.id === senderId) {
                return interaction.editReply({ content: '❌ Нельзя отправить подарок самому себе', embeds: [], files: [] });
            }
            
            if (amount > config.ECONOMY.MAX_GIFT) {
                return interaction.editReply({ content: `❌ Максимальная сумма подарка: ${config.ECONOMY.MAX_GIFT} экзпоинтов`, embeds: [], files: [] });
            }
            
            const db = getDb();
            const sender = await db.get('SELECT balance, daily_gifts_sent FROM users WHERE user_id = ?', senderId);
            let receiverData = await db.get('SELECT balance, daily_gifts_received FROM users WHERE user_id = ?', receiver.id);
            
            if (!receiverData) {
                await db.run('INSERT INTO users (user_id) VALUES (?)', receiver.id);
                receiverData = await db.get('SELECT balance, daily_gifts_received FROM users WHERE user_id = ?', receiver.id);
            }
            
            if (!sender || sender.balance < amount) {
                return interaction.editReply({ content: '❌ Недостаточно средств', embeds: [], files: [] });
            }
            
            if (sender.daily_gifts_sent >= config.ECONOMY.DAILY_GIFT_LIMIT) {
                return interaction.editReply({ content: `❌ Вы можете отправить не более ${config.ECONOMY.DAILY_GIFT_LIMIT} подарков в день`, embeds: [], files: [] });
            }
            
            if (receiverData.daily_gifts_received + amount > config.ECONOMY.DAILY_GIFT_RECEIVE_LIMIT) {
                return interaction.editReply({ content: `❌ Лимит получения подарков: ${config.ECONOMY.DAILY_GIFT_RECEIVE_LIMIT} экзпоинтов`, embeds: [], files: [] });
            }
            
            const commission = Math.floor(amount * 0.1);
            const netAmount = amount - commission;
            
            await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', amount, senderId);
            await db.run('UPDATE users SET balance = balance + ?, daily_gifts_received = daily_gifts_received + ? WHERE user_id = ?', netAmount, amount, receiver.id);
            await db.run('UPDATE users SET daily_gifts_sent = daily_gifts_sent + 1 WHERE user_id = ?', senderId);
            await distributeCommission(client, commission);
            
            await logGift(client, `Подарок от ${interaction.user.username}`, [
                { name: 'Получатель', value: `<@${receiver.id}>`, inline: true },
                { name: 'Сумма', value: `${netAmount} экзпоинтов (комиссия: ${commission})`, inline: true }
            ]);
            
            const canvas = await renderGift(interaction.user.username, receiver.username, netAmount, message);
            await sendImageEmbed(interaction, canvas, 'Подарок отправлен!', '#0B0B0C');
            
            try {
                const receiverCanvas = await renderGift(interaction.user.username, receiver.username, netAmount, message);
                const buffer = receiverCanvas.toBuffer();
                const { AttachmentBuilder } = require('discord.js');
                const attachment = new AttachmentBuilder(buffer, { name: 'gift.png' });
                await receiver.send({ embeds: [{ title: 'Вам отправили подарок!', image: { url: 'attachment://gift.png' }, color: 0xff66cc }], files: [attachment] });
            } catch (e) {}
        } catch (error) {
            console.error('Ошибка в gift:', error);
            await interaction.editReply({ content: '❌ Ошибка при отправке подарка', embeds: [], files: [] });
        }
    }
};