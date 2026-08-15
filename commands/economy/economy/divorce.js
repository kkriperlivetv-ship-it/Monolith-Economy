const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../../database');
const { createEmbed } = require('../../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('divorce')
        .setDescription('Развестись с супругом(ой) и удалить любовную комнату'),

    async execute(client, interaction) {
        await interaction.deferReply({ ephemeral: true });

        const db = getDb();
        const marriage = await db.get('SELECT * FROM marriages WHERE user1_id = ? OR user2_id = ?', interaction.user.id, interaction.user.id);

        if (!marriage) {
            return interaction.editReply({
                embeds: [createEmbed('❌ Вы не в браке', [
                    { name: 'Статус', value: 'Чтобы развестись, нужно сначала вступить в брак через `/shop` → «Брак».', inline: false }
                ])],
                components: []
            });
        }

        const partnerId = marriage.user1_id === interaction.user.id ? marriage.user2_id : marriage.user1_id;
        let partnerName = `<@${partnerId}>`;
        try {
            const member = await interaction.guild.members.fetch(partnerId);
            partnerName = member.displayName || partnerId;
        } catch (e) {}

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`divorce_confirm:${interaction.guild.id}:${interaction.user.id}`)
                .setLabel('💔 Подтвердить')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`divorce_cancel:${interaction.guild.id}:${interaction.user.id}`)
                .setLabel('❌ Отмена')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.editReply({
            embeds: [createEmbed('💔 Развод', [
                { name: 'Супруг(а)', value: partnerName, inline: true },
                { name: 'Комната', value: marriage.channel_id ? 'Будет удалена навсегда' : 'Не найдена', inline: true },
                { name: 'Внимание', value: 'Любовная комната будет **удалена**, а статус «В браке с…» сброшен. Это действие нельзя отменить!', inline: false }
            ])],
            components: [row]
        });
    }
};
