const { SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../../../database');
const { createEmbed } = require('../../../utils/embedBuilder');
const { logEconomy } = require('../../../utils/logger');
const config = require('../../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Перевести экзпоинты другому пользователю')
        .addUserOption(option => option.setName('user').setDescription('Получатель').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Сумма').setRequired(true).setMinValue(1)),
    
    async execute(client, interaction) {
        const senderId = interaction.user.id;
        const receiver = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        
        if (receiver.id === senderId) {
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: 'Нельзя перевести самому себе', inline: false }], 0x1A1C1E)],
                ephemeral: true
            });
        }
        
        if (amount > config.ECONOMY.MAX_TRANSFER) {
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: `Максимальный перевод: ${config.ECONOMY.MAX_TRANSFER} экзпоинтов`, inline: false }], 0x1A1C1E)],
                ephemeral: true
            });
        }
        
        const db = getDb();
        const sender = await db.get('SELECT balance, daily_sent FROM users WHERE user_id = ?', senderId);
        let receiverData = await db.get('SELECT balance, daily_received FROM users WHERE user_id = ?', receiver.id);
        
        if (!receiverData) {
            await db.run('INSERT INTO users (user_id) VALUES (?)', receiver.id);
            receiverData = await db.get('SELECT balance, daily_received FROM users WHERE user_id = ?', receiver.id);
        }
        
        if (!sender || sender.balance < amount) {
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: 'Недостаточно средств', inline: false }], 0x1A1C1E)],
                ephemeral: true
            });
        }
        
        if (sender.daily_sent + amount > config.ECONOMY.DAILY_SEND_LIMIT) {
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: `Дневной лимит отправки: ${config.ECONOMY.DAILY_SEND_LIMIT} экзпоинтов`, inline: false }], 0x1A1C1E)],
                ephemeral: true
            });
        }
        
        if (receiverData.daily_received + amount > config.ECONOMY.DAILY_RECEIVE_LIMIT) {
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: `Дневной лимит получения: ${config.ECONOMY.DAILY_RECEIVE_LIMIT} экзпоинтов`, inline: false }], 0x1A1C1E)],
                ephemeral: true
            });
        }
        
        const newSenderBalance = sender.balance - amount;
        const newReceiverBalance = receiverData.balance + amount;
        
        if (newReceiverBalance > config.ECONOMY.MAX_BALANCE) {
            return interaction.reply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: `У получателя превышен лимит баланса (${config.ECONOMY.MAX_BALANCE})`, inline: false }], 0x1A1C1E)],
                ephemeral: true
            });
        }
        
        await db.run('UPDATE users SET balance = ?, daily_sent = daily_sent + ? WHERE user_id = ?', newSenderBalance, amount, senderId);
        await db.run('UPDATE users SET balance = ?, daily_received = daily_received + ? WHERE user_id = ?', newReceiverBalance, amount, receiver.id);
        
        await logEconomy(client, 'Перевод', [
            { name: 'Отправитель', value: `<@${senderId}>`, inline: true },
            { name: 'Получатель', value: `<@${receiver.id}>`, inline: true },
            { name: 'Сумма', value: `${amount} экзпоинтов`, inline: true }
        ]);
        
        await interaction.reply({
            embeds: [createEmbed('✅ Перевод выполнен', [
                { name: 'Сумма', value: `${amount} экзпоинтов`, inline: true },
                { name: 'Получатель', value: `<@${receiver.id}>`, inline: true }
            ], 0x1A1C1E)]
        });
    }
};