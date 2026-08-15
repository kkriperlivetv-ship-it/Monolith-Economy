const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../../database');
const { createEmbed } = require('../../../utils/embedBuilder');
const config = require('../../../config');
const { getGifForEmbed } = require('../../../utils/gifManager');

// Хранилище дуэлей (будет импортировано из buttonHandler)
let duels;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duel')
        .setDescription('Бросить вызов на дуэль')
        .addUserOption(option => option.setName('user').setDescription('Противник').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Ставка (1000-50000)').setRequired(true)),
    
    async execute(client, interaction) {
        // Сразу отвечаем, чтобы взаимодействие не истекло
        await interaction.deferReply();
        
        // Импортируем duels из buttonHandler
        const buttonHandler = require('../../../handlers/buttonHandler');
        duels = buttonHandler.duels;
        
        const challengerId = interaction.user.id;
        const opponent = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        
        if (opponent.id === challengerId) {
            return interaction.editReply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: 'Нельзя вызвать самого себя', inline: false }], 0xff0000)]
            });
        }
        
        if (amount < config.ECONOMY.DUEL_MIN || amount > config.ECONOMY.DUEL_MAX) {
            return interaction.editReply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: `Ставка должна быть от ${config.ECONOMY.DUEL_MIN} до ${config.ECONOMY.DUEL_MAX} экзпоинтов`, inline: false }], 0xff0000)]
            });
        }
        
        const db = getDb();
        const challenger = await db.get('SELECT balance FROM users WHERE user_id = ?', challengerId);
        const opponentData = await db.get('SELECT balance FROM users WHERE user_id = ?', opponent.id);
        
        if (!challenger || challenger.balance < amount) {
            return interaction.editReply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: 'У вас недостаточно средств', inline: false }], 0xff0000)]
            });
        }
        
        if (!opponentData || opponentData.balance < amount) {
            return interaction.editReply({
                embeds: [createEmbed('❌ Ошибка', [{ name: '', value: 'У противника недостаточно средств', inline: false }], 0xff0000)]
            });
        }
        
        const duelId = Date.now().toString();
        
        // Гифка для вызова
        const gifData = getGifForEmbed('start');
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_duel:${duelId}`)
                    .setLabel('✅ Принять дуэль')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`cancel_duel:${duelId}`)
                    .setLabel('❌ Отмена')
                    .setStyle(ButtonStyle.Danger)
            );
        
        const embed = {
            title: 'ВЫЗОВ НА ДУЭЛЬ!',
            color: 0x1A1C1E,
            image: gifData ? { url: gifData.url } : null,
            fields: [
                { name: 'Противники', value: `\`\`\`${interaction.user.username} vs ${opponent.username}\`\`\``, inline: false },
                { name: 'Ставка', value: `\`\`\`${amount.toLocaleString()} экзпоинтов\`\`\``, inline: true },
                { name: 'Время', value: `\`\`\`60 секунд\`\`\``, inline: true }
            ],
            timestamp: new Date(),
            footer: { text: 'Экономическая система' }
        };
        
        const reply = await interaction.editReply({
            content: `${opponent}, вам бросили вызов на дуэль!`,
            embeds: [embed],
            files: gifData ? [gifData.attachment] : [],
            components: [row]
        });
        
        duels.set(duelId, {
            challenger: challengerId,
            opponent: opponent.id,
            amount: amount,
            challengerChoice: null,
            opponentChoice: null,
            messageId: reply.id,
            channelId: interaction.channelId,
            expiresAt: Date.now() + 60000
        });
        
        setTimeout(() => {
            const duel = duels.get(duelId);
            if (duel && !duel.challengerChoice && !duel.opponentChoice) {
                duels.delete(duelId);
                interaction.channel.send({
                    content: `Время вышло! Дуэль между <@${challengerId}> и <@${opponent.id}> отменена.`,
                    embeds: []
                }).catch(() => {});
            }
        }, 60000);
    }
};