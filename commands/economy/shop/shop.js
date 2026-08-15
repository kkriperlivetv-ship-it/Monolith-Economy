const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getDb } = require('../../../database');
const { renderShop, sendImageEmbed } = require('../../../utils/imageGenerator');
const { logEconomy } = require('../../../utils/logger');
const config = require('../../../config');

// ID роли для модератора (настраивается в config.js)
const MODERATOR_ROLE_ID = config.ROLES.MODERATOR;

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

// Товары в магазине
const SHOP_ITEMS = {
    private_room: {
        id: 'private_room',
        name: 'Личная комната',
        price: 2000,
        description: 'Создание личного голосового канала на месяц',
        type: 'subscription',
        emoji: '🏠'
    },
    custom_role: {
        id: 'custom_role',
        name: 'Кастомная роль',
        price: 150000,
        description: 'Создание своей роли с уникальным названием и цветом',
        type: 'role_creation',
        emoji: '👑'
    },
    moderator_access: {
        id: 'moderator_access',
        name: 'Доступ к модерированию',
        price: 50000,
        description: 'Права модератора на сервере',
        type: 'role',
        roleId: MODERATOR_ROLE_ID,
        emoji: '🛡️'
    },
    marriage: {
        id: 'marriage',
        name: 'Брак',
        price: 2000,
        description: 'Вступить в брак с другим пользователем и получить любовную комнату',
        type: 'marriage',
        emoji: '💍'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Магазин товаров и услуг'),
    
    async execute(client, interaction) {
        await interaction.deferReply();
        
        try {
            const userId = interaction.user.id;
            const db = getDb();
            
            const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
            const balance = user ? user.balance : 0;
            
            const subscription = await db.get('SELECT * FROM subscriptions WHERE user_id = ? AND type = ? AND expires_at > ?', 
                userId, 'private_room', Math.floor(Date.now() / 1000));
            
            const hasActiveSubscription = !!subscription;
            
            const canvas = await renderShop(balance, SHOP_ITEMS, hasActiveSubscription);
            
            const row = new ActionRowBuilder();

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_buy:private_room')
                    .setLabel('Личная комната')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop_buy:custom_role')
                    .setLabel('Кастомная роль')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop_buy:moderator_access')
                    .setLabel('Доступ к модерированию')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop_buy:marriage')
                    .setLabel('Брак')
                    .setStyle(ButtonStyle.Success)
            );
            
            await sendImageEmbed(interaction, canvas, 'Магазин', '#0B0B0C');
            await interaction.editReply({ components: [row] });
            
        } catch (error) {
            console.error('Ошибка в shop:', error);
            await interaction.editReply({ 
                content: '❌ Ошибка при загрузке магазина', 
                embeds: [], 
                files: [], 
                components: [] 
            });
        }
    }
};

// Функция для показа модального окна выбора цвета
async function showColorMenu(interaction, userId, rolePrice) {
    const colorButtons = new ActionRowBuilder();
    
    // Создаём кнопки для выбора цвета (по 4 в ряд)
    const colors = Object.entries(ROLE_COLORS);
    const rows = [];
    let currentRow = new ActionRowBuilder();
    
    for (let i = 0; i < colors.length; i++) {
        const [colorName, colorHex] = colors[i];
        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`role_color:${colorHex}:${colorName}:${userId}:${rolePrice}`)
                .setLabel(colorName)
                .setStyle(ButtonStyle.Secondary)
        );
        
        if ((i + 1) % 4 === 0 || i === colors.length - 1) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
    }
    
    await interaction.editReply({
        content: `🎨 **Выбери цвет для своей роли:**\n\nПосле выбора цвета, тебе нужно будет ввести название роли.`,
        components: rows,
        embeds: [],
        files: []
    });
}

// Функция для показа модального окна ввода названия
async function showNameModal(interaction, colorHex, colorName, userId, rolePrice) {
    const modal = new ModalBuilder()
        .setCustomId(`role_name_modal:${colorHex}:${colorName}:${userId}:${rolePrice}`)
        .setTitle('🎨 Создание кастомной роли');
    
    const nameInput = new TextInputBuilder()
        .setCustomId('role_name')
        .setLabel('Название роли')
        .setPlaceholder('Введи название для своей роли (максимум 32 символа)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setMinLength(2)
        .setRequired(true);
    
    const hoistInput = new TextInputBuilder()
        .setCustomId('role_hoist')
        .setLabel('Отображать отдельно в списке? (да/нет)')
        .setPlaceholder('Введи "да" или "нет"')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(3)
        .setRequired(false);
    
    const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
    const secondActionRow = new ActionRowBuilder().addComponents(hoistInput);
    
    modal.addComponents(firstActionRow, secondActionRow);
    
    await interaction.showModal(modal);
}

// Обработка покупки кастомной роли
async function buyCustomRole(client, interaction, userId, item, db) {
    // Проверяем, есть ли уже роль у пользователя
    const existingRole = await db.get('SELECT * FROM user_roles WHERE user_id = ?', userId);
    if (existingRole) {
        return interaction.editReply({ 
            content: '❌ У вас уже есть кастомная роль! Используйте `/editrole` для её изменения.',
            ephemeral: true 
        });
    }
    
    // Проверяем баланс
    const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
    if (!user || user.balance < item.price) {
        return interaction.editReply({ 
            content: `❌ Недостаточно средств! Нужно ${item.price.toLocaleString()} экзпоинтов`,
            ephemeral: true 
        });
    }
    
    // Снимаем деньги
    await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', item.price, userId);
    
    // Сохраняем временные данные о покупке
    await db.run('INSERT INTO pending_purchases (user_id, type, price, expires_at) VALUES (?, ?, ?, ?)',
        userId, 'custom_role', item.price, Date.now() + 5 * 60 * 1000);
    
    // Показываем меню выбора цвета
    await showColorMenu(interaction, userId, item.price);
}

// Создание роли после выбора цвета и названия
async function createCustomRole(client, interaction, colorHex, colorName, userId, rolePrice, roleName, hoist) {
    try {
        const member = await interaction.guild.members.fetch(userId);
        
        // Создаём роль
        const role = await interaction.guild.roles.create({
            name: roleName,
            color: colorHex,
            hoist: hoist === 'да' || hoist === 'true' || hoist === 'yes',
            reason: `Куплена пользователем ${member.displayName} за ${rolePrice} экзпоинтов`
        });
        
        // Помещаем роль ниже роли бота
        const botRole = interaction.guild.members.me.roles.highest;
        await role.setPosition(botRole.position - 1);
        
        // Выдаём роль пользователю
        await member.roles.add(role);
        
        const db = getDb();
        
        // Сохраняем роль в БД
        await db.run('INSERT INTO user_roles (user_id, role_id, role_name, color_hex, total_invested) VALUES (?, ?, ?, ?, ?)',
            userId, role.id, roleName, colorHex, rolePrice);
        
        // Удаляем временную покупку
        await db.run('DELETE FROM pending_purchases WHERE user_id = ? AND type = ?', userId, 'custom_role');
        
        await logEconomy(client, '👑 Создание кастомной роли', [
            { name: 'Пользователь', value: `<@${userId}>`, inline: true },
            { name: 'Название роли', value: roleName, inline: true },
            { name: 'Цвет', value: colorName || colorHex, inline: true },
            { name: 'Отдельный список', value: hoist === 'да' ? 'Да' : 'Нет', inline: true },
            { name: 'Стоимость', value: `${rolePrice.toLocaleString()} экзпоинтов`, inline: true }
        ]);
        
        await interaction.editReply({
            content: `✅ **Кастомная роль успешно создана!**\n\n` +
                    `👑 **Название:** ${roleName}\n` +
                    `🎨 **Цвет:** ${colorName || colorHex}\n` +
                    `📋 **Отдельный список:** ${hoist === 'да' ? 'Да' : 'Нет'}\n\n` +
                    `✨ Твоя роль: ${role.toString()}\n` +
                    `💰 Снято: ${rolePrice.toLocaleString()} экзпоинтов\n\n` +
                    `🔧 Изменить роль можно командой \`/editrole\``,
            components: [],
            embeds: [],
            files: []
        });
        
    } catch (error) {
        console.error('Ошибка при создании роли:', error);
        await interaction.editReply({ 
            content: `❌ Ошибка при создании роли: ${error.message}`,
            components: [],
            embeds: [],
            files: []
        });
    }
}

// Обработка покупки личной комнаты
async function buyPrivateRoom(client, interaction, userId, item, db) {
    const nowSec = Math.floor(Date.now() / 1000);
    const existing = await db.get(
        'SELECT * FROM subscriptions WHERE user_id = ? AND type = ? AND expires_at > ? ORDER BY id DESC LIMIT 1', 
        userId, 'private_room', nowSec
    );
    
    if (existing && existing.channel_id) {
        const existingChannel = await interaction.guild.channels.fetch(existing.channel_id).catch(() => null);
        if (existingChannel) {
            return interaction.editReply({ 
                content: `❌ У вас уже есть активная подписка и личная комната: ${existingChannel.toString()}!`,
                ephemeral: true 
            });
        }
    }
    
    const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
    if (!user || user.balance < item.price) {
        return interaction.editReply({ 
            content: `❌ Недостаточно средств! Нужно ${item.price.toLocaleString()} экзпоинтов.`,
            ephemeral: true 
        });
    }

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member) {
        return interaction.editReply({
            content: '❌ Не удалось получить данные вашего профиля на сервере.',
            ephemeral: true
        });
    }

    let parentCategory = null;
    if (config.CHANNELS.PRIVATE_ROOM_CATEGORY) {
        const cat = interaction.guild.channels.cache.get(config.CHANNELS.PRIVATE_ROOM_CATEGORY) ||
                    await interaction.guild.channels.fetch(config.CHANNELS.PRIVATE_ROOM_CATEGORY).catch(() => null);
        if (cat && cat.type === 4) {
            parentCategory = cat.id;
        }
    }

    let voiceChannel;
    try {
        const channelOptions = {
            name: `🏠 ${member.displayName || interaction.user.username}`,
            type: 2,
            userLimit: 10,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['Connect'] },
                { id: userId, allow: ['Connect', 'ViewChannel', 'ManageChannels', 'MuteMembers', 'DeafenMembers', 'MoveMembers'] }
            ]
        };
        if (parentCategory) {
            channelOptions.parent = parentCategory;
        }

        voiceChannel = await interaction.guild.channels.create(channelOptions);
    } catch (channelError) {
        console.error('Ошибка при создании голосового канала:', channelError);
        return interaction.editReply({
            content: `❌ Не удалось создать голосовой канал: ${channelError.message}. Пожалуйста, убедитесь, что у бота есть права «Управление каналами».`,
            ephemeral: true
        });
    }
    
    await db.run('UPDATE users SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?', item.price, item.price, userId);

    const expiresAtMs = Date.now() + (30 * 24 * 60 * 60 * 1000);
    const expiresAtSeconds = Math.floor(expiresAtMs / 1000);

    await db.run('DELETE FROM subscriptions WHERE user_id = ? AND type = ?', userId, 'private_room');
    await db.run('INSERT INTO subscriptions (user_id, type, channel_id, expires_at) VALUES (?, ?, ?, ?)',
        userId, 'private_room', voiceChannel.id, expiresAtSeconds);
    
    await logEconomy(client, '🏠 Покупка личной комнаты', [
        { name: 'Пользователь', value: `<@${userId}>`, inline: true },
        { name: 'Комната', value: voiceChannel.name, inline: true },
        { name: 'Подписка до', value: new Date(expiresAtMs).toLocaleDateString(), inline: true }
    ]);
    
    await interaction.editReply({ 
        content: `✅ **Личная комната успешно создана!**\n\n` +
                `🏠 **Канал:** ${voiceChannel.toString()}\n` +
                `💰 **Снято:** ${item.price.toLocaleString()} экзпоинтов\n` +
                `⏰ **Подписка действует до:** ${new Date(expiresAtMs).toLocaleDateString()}\n\n` +
                `🔧 Вы можете управлять комнатой через **Панель управления комнатой** или напрямую.`,
        ephemeral: true 
    });
}

// Обработка покупки доступа к модерированию
async function buyModeratorAccess(client, interaction, userId, item, db) {
    const member = await interaction.guild.members.fetch(userId);
    const role = interaction.guild.roles.cache.get(item.roleId);
    
    if (!role) {
        return interaction.editReply({ 
            content: '❌ Роль модератора не найдена! Обратитесь к администратору.',
            ephemeral: true 
        });
    }
    
    if (member.roles.cache.has(item.roleId)) {
        return interaction.editReply({ 
            content: '❌ У вас уже есть роль модератора!',
            ephemeral: true 
        });
    }
    
    const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
    if (!user || user.balance < item.price) {
        return interaction.editReply({ 
            content: `❌ Недостаточно средств! Нужно ${item.price.toLocaleString()} экзпоинтов`,
            ephemeral: true 
        });
    }
    
    await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', item.price, userId);
    await member.roles.add(role);
    
    await logEconomy(client, '🛡️ Покупка доступа к модерированию', [
        { name: 'Пользователь', value: `<@${userId}>`, inline: true },
        { name: 'Роль', value: role.name, inline: true },
        { name: 'Стоимость', value: `${item.price.toLocaleString()} экзпоинтов`, inline: true }
    ]);
    
    await interaction.editReply({ 
        content: `✅ **Доступ к модерированию получен!**\n\n` +
                `🛡️ Вам выдана роль: ${role.toString()}\n` +
                `💰 Снято: ${item.price.toLocaleString()} экзпоинтов`,
        ephemeral: true 
    });
}

// Основная функция обработки покупок
async function handleShopPurchase(client, interaction, itemId) {
    const userId = interaction.user.id;
    const db = getDb();
    const item = SHOP_ITEMS[itemId];
    
    if (!item) {
        return interaction.reply({ content: '❌ Товар не найден', ephemeral: true });
    }
    
    switch (itemId) {
        case 'private_room':
            await buyPrivateRoom(client, interaction, userId, item, db);
            break;
        case 'custom_role':
            await buyCustomRole(client, interaction, userId, item, db);
            break;
        case 'moderator_access':
            await buyModeratorAccess(client, interaction, userId, item, db);
            break;
        default:
            await interaction.reply({ content: '❌ Неизвестный товар', ephemeral: true });
    }
}

// Экспортируем всё необходимое
module.exports.handleShopPurchase = handleShopPurchase;
module.exports.showColorMenu = showColorMenu;
module.exports.showNameModal = showNameModal;
module.exports.ROLE_COLORS = ROLE_COLORS;
