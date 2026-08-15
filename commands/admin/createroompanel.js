const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

// Цвет #1A1C1E в десятичном формате
const EMBED_COLOR = 1711134;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createroompanel')
        .setDescription('Создать панель управления личными комнатами (Только для администрации)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(client, interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ У вас нет прав администратора!',
                ephemeral: true
            });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        // Кнопки управления (все тёмные - ButtonStyle.Secondary)
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('room_panel_name')
                    .setLabel('Изменить название')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('room_panel_limit')
                    .setLabel('Лимит участников')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('room_panel_kick')
                    .setLabel('Кикнуть участника')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('room_panel_close')
                    .setLabel('Закрыть')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        // Дизайн как в твоём шаблоне
        const embed = {
            title: 'Панель управления комнатой',
            color: EMBED_COLOR,
            fields: [
                {
                    name: 'Изменить название',
                    value: '```Изменить название вашей комнаты```',
                    inline: true
                },
                {
                    name: 'Лимит участников',
                    value: '```Установить лимит (0-99)```',
                    inline: true
                },
                {
                    name: 'Кикнуть участника',
                    value: '```Выгнать участника из комнаты```',
                    inline: true
                },
                {
                    name: 'Закрыть',
                    value: '```Запретить или разрешить вход```',
                    inline: true
                }
            ],
            timestamp: new Date()
        };
        
        const panelChannel = interaction.guild.channels.cache.get(config.CHANNELS.PRIVATE_ROOM_PANEL) || interaction.channel;
        await panelChannel.send({
            embeds: [embed],
            components: [row]
        });
        
        await interaction.editReply({
            content: '✅ Панель управления комнатами создана!',
            ephemeral: true
        });
    }
};