const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { getDb } = require('../../../database');
const { createEmbed } = require('../../../utils/embedBuilder');
const { logEconomy } = require('../../../utils/logger');
const config = require('../../../config');

// Доступные цвета для роли (название и HEX)
const ROLE_COLORS = [
    { name: 'Красный', value: '#FF4444' },
    { name: 'Зелёный', value: '#00FF88' },
    { name: 'Синий', value: '#4A9EFF' },
    { name: 'Жёлтый', value: '#FFD700' },
    { name: 'Фиолетовый', value: '#9B59B6' },
    { name: 'Оранжевый', value: '#FFA500' },
    { name: 'Розовый', value: '#FF69B4' },
    { name: 'Голубой', value: '#00CED1' },
    { name: 'Белый', value: '#FFFFFF' },
    { name: 'Серый', value: '#808080' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buyrole')
        .setDescription('👑 Создать свою кастомную роль')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Название роли (максимум 32 символа)')
                .setRequired(true)
                .setMaxLength(32))
        .addStringOption(option => 
            option.setName('color')
                .setDescription('Цвет роли (HEX код или название)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('hoist')
                .setDescription('Отображать роль отдельно в списке участников?')
                .setRequired(false)),
    
    async execute(client, interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const userId = interaction.user.id;
            const roleName = interaction.options.getString('name');
            let colorInput = interaction.options.getString('color');
            const hoist = interaction.options.getBoolean('hoist') || false;
            
            // Проверка названия на запрещённые символы
            const invalidChars = /[<>@&\/\\#]|@everyone|@here/gi;
            if (invalidChars.test(roleName)) {
                return interaction.editReply({ 
                    content: '❌ Название роли содержит запрещённые символы!',
                    ephemeral: true 
                });
            }
            
            // Обработка цвета
            let roleColor = '#808080'; // цвет по умолчанию (серый)
            
            if (colorInput) {
                // Проверяем, является ли ввод названием цвета
                const foundColor = ROLE_COLORS.find(c => c.name.toLowerCase() === colorInput.toLowerCase());
                if (foundColor) {
                    roleColor = foundColor.value;
                } 
                // Проверяем, является ли HEX кодом
                else if (/^#[0-9A-Fa-f]{6}$/.test(colorInput)) {
                    roleColor = colorInput;
                }
                else if (/^[0-9A-Fa-f]{6}$/.test(colorInput)) {
                    roleColor = `#${colorInput}`;
                }
                else {
                    return interaction.editReply({ 
                        content: `❌ Неверный формат цвета!\nДоступные цвета: ${ROLE_COLORS.map(c => c.name).join(', ')}\nИли HEX код: #FF0000, FF0000`,
                        ephemeral: true 
                    });
                }
            }
            
            const db = getDb();
            const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
            
            if (!user || user.balance < config.ROLES.CREATE_COST) {
                return interaction.editReply({ 
                    content: `❌ Недостаточно средств! Нужно ${config.ROLES.CREATE_COST.toLocaleString()} экзпоинтов`,
                    ephemeral: true 
                });
            }
            
            // Проверяем, нет ли уже созданной роли у пользователя
            const existingRole = await db.get('SELECT * FROM user_roles WHERE user_id = ?', userId);
            if (existingRole) {
                return interaction.editReply({ 
                    content: '❌ У вас уже есть кастомная роль! Вы можете изменить её через команду `/editrole`',
                    ephemeral: true 
                });
            }
            
            const member = await interaction.guild.members.fetch(userId);
            
            // Создаём роль
            const role = await interaction.guild.roles.create({
                name: roleName,
                color: roleColor,
                reason: `Создана пользователем ${member.displayName} за ${config.ROLES.CREATE_COST} экзпоинтов`
            });
            
            // Помещаем роль ниже роли бота, но выше остальных
            const botRole = interaction.guild.members.me.roles.highest;
            await role.setPosition(botRole.position - 1);
            
            // Выдаём роль пользователю
            await member.roles.add(role);
            
            // Снимаем деньги и сохраняем в БД
            await db.run('UPDATE users SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?', 
                         config.ROLES.CREATE_COST, config.ROLES.CREATE_COST, userId);
            
            await db.run('INSERT INTO user_roles (user_id, role_id, role_name, color_hex, total_invested) VALUES (?, ?, ?, ?, ?)',
                         userId, role.id, roleName, roleColor, config.ROLES.CREATE_COST);
            
            await logEconomy(client, '👑 Покупка кастомной роли', [
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Название роли', value: roleName, inline: true },
                { name: 'Цвет', value: roleColor, inline: true },
                { name: 'Стоимость', value: `${config.ROLES.CREATE_COST.toLocaleString()} экзпоинтов`, inline: true }
            ]);
            
            // Создаём embed с информацией о роли
            const embed = createEmbed('✅ Кастомная роль создана!', [
                { name: 'Название', value: roleName, inline: true },
                { name: 'Цвет', value: roleColor, inline: true },
                { name: 'Отдельный список', value: hoist ? 'Да' : 'Нет', inline: true },
                { name: 'Стоимость', value: `${config.ROLES.CREATE_COST.toLocaleString()} экзпоинтов`, inline: true },
                { name: 'Роль', value: role.toString(), inline: true }
            ], 0x00ff00);
            
            await interaction.editReply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('Ошибка в buyrole:', error);
            await interaction.editReply({ 
                content: `❌ Ошибка при создании роли: ${error.message}`,
                ephemeral: true 
            });
        }
    }
};