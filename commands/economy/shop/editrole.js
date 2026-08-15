const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getDb } = require('../../../database');
const { createEmbed } = require('../../../utils/embedBuilder');
const { logEconomy } = require('../../../utils/logger');

// Доступные цвета для роли
const ROLE_COLORS = {
    '🔴 Красный': '#FF4444',
    '🟢 Зелёный': '#00FF88',
    '🔵 Синий': '#4A9EFF',
    '🟡 Жёлтый': '#FFD700',
    '🟣 Фиолетовый': '#9B59B6',
    '🟠 Оранжевый': '#FFA500',
    '💗 Розовый': '#FF69B4',
    '💙 Голубой': '#00CED1',
    '⚪ Белый': '#FFFFFF',
    '⚫ Серый': '#808080',
    '🟤 Коричневый': '#8B4513',
    '🔴 Бордовый': '#800000'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editrole')
        .setDescription('✏️ Изменить свою кастомную роль (название, цвет, отображение)'),
    
    async execute(client, interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const userId = interaction.user.id;
            const db = getDb();
            
            // Находим роль пользователя
            const userRole = await db.get('SELECT * FROM user_roles WHERE user_id = ?', userId);
            
            if (!userRole) {
                return interaction.editReply({ 
                    content: '❌ У вас нет кастомной роли! Используйте `/shop` для покупки.',
                    ephemeral: true 
                });
            }
            
            const role = await interaction.guild.roles.fetch(userRole.role_id);
            
            if (!role) {
                return interaction.editReply({ 
                    content: '❌ Ваша роль не найдена на сервере! Обратитесь к администратору.',
                    ephemeral: true 
                });
            }
            
            // Создаём кнопки для выбора действия
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`editrole_name:${userRole.role_id}`)
                        .setLabel('Изменить название')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`editrole_color:${userRole.role_id}`)
                        .setLabel('Изменить цвет')
                        .setStyle(ButtonStyle.Success)
                );
            
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`editrole_reset:${userRole.role_id}`)
                        .setLabel('Сбросить настройки')
                        .setStyle(ButtonStyle.Danger)
                );
            
            // Показываем текущие настройки роли
            await interaction.editReply({
                embeds: [createEmbed('Редактирование роли', [
                    { name: 'Текущее название', value: role.name, inline: true },
                    { name: 'Текущий цвет', value: userRole.color_hex || '#808080', inline: true },
                    { name: 'Роль', value: role.toString(), inline: true }
                ], 0x00aaff)],
                components: [row1, row2],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Ошибка в editrole:', error);
            await interaction.editReply({ 
                content: `❌ Ошибка: ${error.message}`,
                ephemeral: true 
            });
        }
    }
};

// Функция для показа модального окна изменения названия
async function showEditNameModal(interaction, roleId) {
    const modal = new ModalBuilder()
        .setCustomId(`edit_name_modal:${roleId}`)
        .setTitle('Изменить название роли');
    
    const nameInput = new TextInputBuilder()
        .setCustomId('new_name')
        .setLabel('Новое название роли')
        .setPlaceholder('Введи новое название (максимум 32 символа)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setMinLength(2)
        .setRequired(true);
    
    const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
    modal.addComponents(firstActionRow);
    
    await interaction.showModal(modal);
}

// Функция для показа меню выбора цвета
async function showColorMenu(interaction, roleId) {
    const rows = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;
    
    for (const [colorName, colorHex] of Object.entries(ROLE_COLORS)) {
        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`edit_color:${roleId}:${colorHex}:${colorName}`)
                .setLabel(colorName)
                .setStyle(ButtonStyle.Secondary)
        );
        buttonCount++;
        
        if (buttonCount === 4) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
            buttonCount = 0;
        }
    }
    
    if (buttonCount > 0) {
        rows.push(currentRow);
    }
    
    await interaction.update({
        content: '**Выбери новый цвет для своей роли:**',
        components: rows,
        embeds: [],
        ephemeral: true
    });
}

// Функция для изменения названия
async function editRoleName(interaction, roleId, newName) {
    try {
        const db = getDb();
        const guild = interaction.guild;
        const role = await guild.roles.fetch(roleId);
        const userRole = await db.get('SELECT * FROM user_roles WHERE role_id = ?', roleId);
        
        if (!role) {
            return interaction.reply({
                content: '❌ Роль не найдена!',
                ephemeral: true
            });
        }
        
        // Проверка на запрещённые символы
        const invalidChars = /[<>@&\/\\#]|@everyone|@here/gi;
        if (invalidChars.test(newName)) {
            return interaction.reply({
                content: '❌ Название содержит запрещённые символы!',
                ephemeral: true
            });
        }
        
        const oldName = role.name;
        await role.setName(newName);
        await db.run('UPDATE user_roles SET role_name = ? WHERE role_id = ?', newName, roleId);
        
        await logEconomy(interaction.client, 'Изменение роли', [
            { name: 'Пользователь', value: `<@${userRole.user_id}>`, inline: true },
            { name: 'Было название', value: oldName, inline: true },
            { name: 'Стало название', value: newName, inline: true }
        ]);
        
        await interaction.reply({
            content: `✅ Название роли изменено с **${oldName}** на **${newName}**!`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Ошибка при изменении названия:', error);
        await interaction.reply({
            content: `❌ Ошибка: ${error.message}`,
            ephemeral: true
        });
    }
}

// Функция для изменения цвета
async function editRoleColor(interaction, roleId, colorHex, colorName) {
    try {
        const db = getDb();
        const guild = interaction.guild;
        const role = await guild.roles.fetch(roleId);
        const userRole = await db.get('SELECT * FROM user_roles WHERE role_id = ?', roleId);
        
        if (!role) {
            return interaction.reply({
                content: '❌ Роль не найдена!',
                ephemeral: true
            });
        }
        
        await role.setColor(colorHex);
        await db.run('UPDATE user_roles SET color_hex = ? WHERE role_id = ?', colorHex, roleId);
        
        await logEconomy(interaction.client, 'Изменение роли', [
            { name: 'Пользователь', value: `<@${userRole.user_id}>`, inline: true },
            { name: 'Новый цвет', value: colorName, inline: true }
        ]);
        
        await interaction.update({
            content: `✅ Цвет роли изменён на **${colorName}**!`,
            components: [],
            embeds: [],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Ошибка при изменении цвета:', error);
        await interaction.reply({
            content: `❌ Ошибка: ${error.message}`,
            ephemeral: true
        });
    }
}

// Функция для изменения отображения (hoist)
async function editRoleHoist(interaction, roleId) {
    try {
        const db = getDb();
        const guild = interaction.guild;
        const role = await guild.roles.fetch(roleId);
        const userRole = await db.get('SELECT * FROM user_roles WHERE role_id = ?', roleId);
        
        if (!role) {
            return interaction.reply({
                content: '❌ Роль не найдена!',
                ephemeral: true
            });
        }
        
        const newHoist = !role.hoist;
        await role.setHoist(newHoist);
        
        await logEconomy(interaction.client, 'Изменение роли', [
            { name: 'Пользователь', value: `<@${userRole.user_id}>`, inline: true },
            { name: 'Отдельный список', value: newHoist ? 'Включён' : 'Выключен', inline: true }
        ]);
        
        await interaction.update({
            content: `✅ Отображение роли изменено: теперь роль ${newHoist ? 'отображается отдельно' : 'в общем списке'}!`,
            components: [],
            embeds: [],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Ошибка при изменении hoist:', error);
        await interaction.reply({
            content: `❌ Ошибка: ${error.message}`,
            ephemeral: true
        });
    }
}

// Функция для сброса настроек роли
async function resetRoleSettings(interaction, roleId) {
    try {
        const db = getDb();
        const guild = interaction.guild;
        const role = await guild.roles.fetch(roleId);
        const userRole = await db.get('SELECT * FROM user_roles WHERE role_id = ?', roleId);
        
        if (!role) {
            return interaction.reply({
                content: '❌ Роль не найдена!',
                ephemeral: true
            });
        }
        
        // Сброс настроек
        await role.setName(`Владелец: ${interaction.user.username}`);
        await role.setColor('#808080');
        await role.setHoist(false);
        
        await db.run('UPDATE user_roles SET role_name = ?, color_hex = ? WHERE role_id = ?', 
            `Владелец: ${interaction.user.username}`, '#808080', roleId);
        
        await logEconomy(interaction.client, 'Сброс настроек роли', [
            { name: 'Пользователь', value: `<@${userRole.user_id}>`, inline: true },
            { name: 'Действие', value: 'Сброс всех настроек', inline: true }
        ]);
        
        await interaction.update({
            content: `✅ Настройки роли сброшены до стандартных!\nНазвание: Владелец: ${interaction.user.username}\nЦвет: Серый`,
            components: [],
            embeds: [],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Ошибка при сбросе настроек:', error);
        await interaction.reply({
            content: `❌ Ошибка: ${error.message}`,
            ephemeral: true
        });
    }
}

// Экспортируем все функции
module.exports.editRoleName = editRoleName;
module.exports.editRoleColor = editRoleColor;
module.exports.editRoleHoist = editRoleHoist;
module.exports.resetRoleSettings = resetRoleSettings;
module.exports.showEditNameModal = showEditNameModal;
module.exports.showColorMenu = showColorMenu;