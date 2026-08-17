const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const { getDb } = require('../database');
const { createEmbed } = require('../utils/embedBuilder');
const { logEconomy } = require('../utils/logger');
const { distributeCommission } = require('../utils/commissionHandler');
const config = require('../config');
const { getGifForEmbed } = require('../utils/gifManager');

// Хранилище активных дуэлей
let duels = new Map();

// ID роли для модератора (настраивается в config.js)
const MODERATOR_ROLE_ID = config.ROLES.MODERATOR;

// Цвета для роли
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
        name: '🏠 Личная комната',
        price: 2000,
        description: 'Создание личного голосового канала на месяц',
        type: 'subscription',
        emoji: '🏠'
    },
    custom_role: {
        id: 'custom_role',
        name: '👑 Кастомная роль',
        price: 150000,
        description: 'Создание своей роли с уникальным названием и цветом',
        type: 'role_creation',
        emoji: '👑'
    },
    moderator_access: {
        id: 'moderator_access',
        name: '🛡️ Доступ к модерированию',
        price: 50000,
        description: 'Права модератора на сервере',
        type: 'role',
        roleId: MODERATOR_ROLE_ID,
        emoji: '🛡️'
    },
    marriage: {
        id: 'marriage',
        name: '💍 Брак',
        price: config.MARRIAGE.PRICE,
        description: 'Вступить в брак и получить любовную комнату 💘',
        type: 'marriage',
        emoji: '💍'
    }
};


// ========== ФУНКЦИЯ ОПРЕДЕЛЕНИЯ ПОБЕДИТЕЛЯ ==========
function determineWinner(choice1, choice2) {
    if (choice1 === choice2) return 'tie';
    if (
        (choice1 === 'камень' && choice2 === 'ножницы') ||
        (choice1 === 'ножницы' && choice2 === 'бумага') ||
        (choice1 === 'бумага' && choice2 === 'камень')
    ) {
        return 'challenger';
    }
    return 'opponent';
}



module.exports = async (client, interaction) => {
    const [action, ...dataParts] = interaction.customId.split(':');
    const data = dataParts.join(':');
    
    console.log(`[DEBUG] action: ${action}, data: ${data}, userId: ${interaction.user.id}`);
    
    // ========== ОБРАБОТКА МАГАЗИНА ==========
    if (action === 'shop_buy') {
        await handleShopPurchase(client, interaction, data);
        return;
    }


    // ========== ПАНЕЛЬ УПРАВЛЕНИЯ КОМНАТОЙ (ОБЩАЯ) ==========
    if (action === 'room_panel_name') {
        const db = getDb();
        const room = await getActiveRoomForUser(db, interaction.guild, interaction.user.id);
        
        if (!room) {
            return interaction.reply({
                content: '❌ У вас нет активной комнаты! Купите личную комнату в `/shop` или заключите брак.',
                ephemeral: true
            });
        }
        
        await showRoomNameModal(interaction, room.channelId, interaction.user.id);
        return;
    }

    if (action === 'room_panel_limit') {
        const db = getDb();
        const room = await getActiveRoomForUser(db, interaction.guild, interaction.user.id);
        
        if (!room) {
            return interaction.reply({
                content: '❌ У вас нет активной комнаты! Купите личную комнату в `/shop` или заключите брак.',
                ephemeral: true
            });
        }
        
        await showRoomLimitModal(interaction, room.channelId, interaction.user.id);
        return;
    }

    if (action === 'room_panel_kick') {
        const db = getDb();
        const room = await getActiveRoomForUser(db, interaction.guild, interaction.user.id);
        
        if (!room) {
            return interaction.reply({
                content: '❌ У вас нет активной комнаты! Купите личную комнату в `/shop` или заключите брак.',
                ephemeral: true
            });
        }
        
        await showRoomKickMenu(interaction, room.channelId, interaction.user.id);
        return;
    }

    if (action === 'room_panel_close') {
        const db = getDb();
        const room = await getActiveRoomForUser(db, interaction.guild, interaction.user.id);
        
        if (!room) {
            return interaction.reply({
                content: '❌ У вас нет активной комнаты! Купите личную комнату в `/shop` или заключите брак.',
                ephemeral: true
            });
        }
        
        await closeRoom(interaction, room.channelId, interaction.user.id);
        return;
    }
    
    // ========== ОБРАБОТКА ВЫБОРА ЦВЕТА ДЛЯ ПОКУПКИ РОЛИ ==========
    if (action === 'role_color') {
        const [colorHex, colorName, userId, rolePrice] = data.split(':');
        
        if (interaction.user.id !== userId) {
            return interaction.reply({
                content: '❌ Это не твоя сессия покупки!',
                ephemeral: true
            });
        }
        
        await showNameModal(interaction, colorHex, colorName, userId, parseInt(rolePrice));
        return;
    }
     
    // ========== УПРАВЛЕНИЕ КОМНАТОЙ ==========
if (action === 'room_name') {
    const [channelId, ownerId] = data.split(':');
    
    if (interaction.user.id !== ownerId && !interaction.memberPermissions.has('Administrator')) {
        return interaction.reply({
            content: '❌ Только владелец комнаты может изменять название!',
            ephemeral: true
        });
    }
    
    await showRoomNameModal(interaction, channelId, ownerId);
    return;
}

if (action === 'room_limit') {
    const [channelId, ownerId] = data.split(':');
    
    if (interaction.user.id !== ownerId && !interaction.memberPermissions.has('Administrator')) {
        return interaction.reply({
            content: '❌ Только владелец комнаты может изменять лимит!',
            ephemeral: true
        });
    }
    
    await showRoomLimitModal(interaction, channelId, ownerId);
    return;
}

if (action === 'room_kick') {
    const [channelId, ownerId] = data.split(':');
    
    if (interaction.user.id !== ownerId && !interaction.memberPermissions.has('Administrator')) {
        return interaction.reply({
            content: '❌ Только владелец комнаты может кикать участников!',
            ephemeral: true
        });
    }
    
    await showRoomKickMenu(interaction, channelId, ownerId);
    return;
}

if (action === 'room_close') {
    const [channelId, ownerId] = data.split(':');
    
    if (interaction.user.id !== ownerId && !interaction.memberPermissions.has('Administrator')) {
        return interaction.reply({
            content: '❌ Только владелец комнаты может закрыть её!',
            ephemeral: true
        });
    }
    
    await closeRoom(interaction, channelId, ownerId);
    return;
}
      
    // ========== ОБРАБОТКА РЕДАКТИРОВАНИЯ РОЛИ ==========
    if (action === 'editrole_name') {
        const roleId = data;
        await showEditNameModal(interaction, roleId);
        return;
    }
    
    if (action === 'editrole_color') {
        const roleId = data;
        await showColorMenuForEdit(interaction, roleId);
        return;
    }
    
    if (action === 'edit_color') {
        const [roleId, colorHex, colorName] = data.split(':');
        await editRoleColor(interaction, roleId, colorHex, colorName);
        return;
    }
    
    if (action === 'editrole_hoist') {
        const roleId = data;
        await editRoleHoist(interaction, roleId);
        return;
    }
    
    if (action === 'editrole_reset') {
        const roleId = data;
        await resetRoleSettings(interaction, roleId);
        return;
    }
    
    // ========== ОБРАБОТКА ДУЭЛЕЙ ==========
    if (action === 'accept_duel') {
        await acceptDuel(client, interaction, data);
        return;
    }
    
    if (action === 'cancel_duel') {
        await cancelDuel(client, interaction, data);
        return;
    }
    
    if (action === 'duel_rock') {
        await playRockPaperScissors(client, interaction, 'камень', data);
        return;
    }
    
    if (action === 'duel_paper') {
        await playRockPaperScissors(client, interaction, 'бумага', data);
        return;
    }
    
    if (action === 'duel_scissors') {
        await playRockPaperScissors(client, interaction, 'ножницы', data);
        return;
    }
    
    // ========== ОБРАБОТКА ОГРАБЛЕНИЙ ==========
    if (action === 'robbery_pay') {
        await robberyPay(client, interaction);
        return;
    }

    if (action === 'robbery_fight') {
        await robberyFight(client, interaction);
        return;
    }

    // ========== ОБРАБОТКА ПРЕДЛОЖЕНИЯ БРАКА ==========
    if (action === 'marriage_accept') {
        await acceptMarriage(client, interaction, data);
        return;
    }

    if (action === 'marriage_decline') {
        await declineMarriage(client, interaction, data);
        return;
    }

    // ========== ОБРАБОТКА РАЗВОДА ==========
    if (action === 'divorce_confirm') {
        await divorceConfirm(client, interaction, data);
        return;
    }

    if (action === 'divorce_cancel') {
        await divorceCancel(client, interaction, data);
        return;
    }
};


// ========== ФУНКЦИИ МАГАЗИНА ==========

async function handleShopPurchase(client, interaction, itemId) {
    const userId = interaction.user.id;
    const db = getDb();
    const item = SHOP_ITEMS[itemId];

    if (!item) {
        return interaction.reply({ content: '❌ Товар не найден', ephemeral: true });
    }

    // Брак не требует deferReply: покупателю сразу открываем модальное окно с вводом участника
    if (itemId === 'marriage') {
        return buyMarriage(client, interaction, userId, item, db);
    }

    await interaction.deferReply({ ephemeral: true });

    const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
    const balance = user ? user.balance : 0;

    if (balance < item.price) {
        return interaction.editReply({
            content: `❌ Недостаточно средств! Нужно ${item.price.toLocaleString()} экзпоинтов, у вас ${balance.toLocaleString()} экзпоинтов`,
            ephemeral: true
        });
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
            await interaction.editReply({ content: '❌ Неизвестный товар', ephemeral: true });
    }
}

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
    
    // Проверяем баланс
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

    // Проверяем категорию
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
            type: 2, // GUILD_VOICE
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

    // Снимаем баланс только после успешного создания канала
    await db.run('UPDATE users SET balance = balance - ?, total_spent = total_spent + ? WHERE user_id = ?', item.price, item.price, userId);

    // Месяц в миллисекундах (30 дней)
    const expiresAtMs = Date.now() + (30 * 24 * 60 * 60 * 1000);
    const expiresAtSeconds = Math.floor(expiresAtMs / 1000);

    // Удаляем старые записи этой категории для пользователя
    await db.run('DELETE FROM subscriptions WHERE user_id = ? AND type = ?', userId, 'private_room');

    // Сохраняем новую подписку с привязанным каналом
    await db.run(
        'INSERT INTO subscriptions (user_id, type, channel_id, expires_at) VALUES (?, ?, ?, ?)',
        userId, 'private_room', voiceChannel.id, expiresAtSeconds
    );

    // Логируем транзакцию
    await db.run(
        'INSERT INTO transactions (from_user, to_user, amount, type) VALUES (?, ?, ?, ?)',
        userId, 'system', item.price, 'buy_private_room'
    );

    await logEconomy(client, '🏠 Покупка личной комнаты', [
        { name: 'Пользователь', value: `<@${userId}>`, inline: true },
        { name: 'Комната', value: voiceChannel.name, inline: true },
        { name: 'Подписка до', value: new Date(expiresAtMs).toLocaleDateString(), inline: true }
    ]);

    await interaction.editReply({
        content: `✅ **Личная комната успешно создана!**\n\n` +
                `🏠 **Канал:** ${voiceChannel.toString()}\n` +
                `💰 **Снято:** ${item.price.toLocaleString()} экзпоинтов\n` +
                `⏰ **Срок действия подписки:** до ${new Date(expiresAtMs).toLocaleDateString()}\n\n` +
                `🔧 Управляйте комнатой через **Панель управления комнатой** или напрямую в голосовом канале.`,
        ephemeral: true
    });
}

async function buyCustomRole(client, interaction, userId, item, db) {
    const existingRole = await db.get('SELECT * FROM user_roles WHERE user_id = ?', userId);
    if (existingRole) {
        return interaction.editReply({ 
            content: '❌ У вас уже есть кастомная роль! Используйте `/editrole` для её изменения.',
            ephemeral: true 
        });
    }
    
    await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', item.price, userId);
    await showColorMenuForPurchase(interaction, userId, item.price);
}

async function showColorMenuForPurchase(interaction, userId, rolePrice) {
    const rows = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;
    
    for (const [colorName, colorHex] of Object.entries(ROLE_COLORS)) {
        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`role_color:${colorHex}:${colorName}:${userId}:${rolePrice}`)
                .setLabel(colorName)
                .setStyle(ButtonStyle.Secondary)
        );
        buttonCount++;
        
        if (buttonCount === 3) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
            buttonCount = 0;
        }
    }
    
    if (buttonCount > 0) {
        rows.push(currentRow);
    }
    
    await interaction.editReply({
        content: '🎨 **Выбери цвет для своей роли:**\n\nПосле выбора цвета, тебе нужно будет ввести название роли.',
        components: rows,
        embeds: [],
        files: []
    });
}

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

async function createCustomRole(client, interaction, colorHex, colorName, userId, rolePrice, roleName, hoist) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
    }
    
    try {
        const db = getDb();
        const member = await interaction.guild.members.fetch(userId);
        const isHoist = hoist && (hoist.toLowerCase() === 'да' || hoist.toLowerCase() === 'yes');
        
        const role = await interaction.guild.roles.create({
            name: roleName,
            color: colorHex,
            hoist: isHoist,
            reason: `Куплена пользователем ${member.displayName} за ${rolePrice} экзпоинтов`
        });
        
        const botRole = interaction.guild.members.me.roles.highest;
        if (role.position < botRole.position) {
            try {
                await role.setPosition(botRole.position - 1);
            } catch (posErr) {
                console.warn('Не удалось изменить позицию роли:', posErr.message);
            }
        }
        await member.roles.add(role);
        
        await db.run('INSERT INTO user_roles (user_id, role_id, role_name, color_hex, total_invested) VALUES (?, ?, ?, ?, ?)',
            userId, role.id, roleName, colorHex, rolePrice);
        
        await logEconomy(client, 'Создание кастомной роли', [
            { name: 'Пользователь', value: `<@${userId}>`, inline: true },
            { name: 'Название роли', value: roleName, inline: true },
            { name: 'Цвет', value: colorName, inline: true },
            { name: 'Стоимость', value: `${rolePrice.toLocaleString()} экзпоинтов`, inline: true }
        ]);
        
        await interaction.editReply({
            content: `✅ **Кастомная роль успешно создана!**\n\nНазвание: **${roleName}**\nЦвет: **${colorName}**\nТвоя роль: ${role.toString()}`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Ошибка при создании роли:', error);
        await interaction.editReply({ content: `❌ Ошибка при создании роли: ${error.message}`, ephemeral: true });
    }
}

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

    // Проверяем, может ли бот выдать эту роль (прав ManageRoles + иерархия)
    const botMember = interaction.guild.members.me;
    if (!botMember.permissions.has('ManageRoles')) {
        return interaction.editReply({
            content: '❌ У бота нет права «Управление ролями». Настройте права бота на сервере.',
            ephemeral: true
        });
    }
    if (role.comparePositionTo(botMember.roles.highest) >= 0) {
        return interaction.editReply({
            content: `❌ Роль **${role.name}** стоит выше роли бота в списке ролей. Переместите роль бота выше роли модератора, чтобы выдача была возможна.`,
            ephemeral: true
        });
    }

    await member.roles.add(role);
    await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', item.price, userId);

    await logEconomy(client, '🛡️ Покупка доступа к модерированию', [
        { name: 'Пользователь', value: `<@${userId}>`, inline: true },
        { name: 'Роль', value: role.name, inline: true },
        { name: 'Стоимость', value: `${item.price.toLocaleString()} экзпоинтов`, inline: true }
    ]);
    
    await interaction.editReply({
        content: `✅ **Доступ к модерированию получен!**\n\n🛡️ Вам выдана роль: ${role.toString()}\n💰 Снято: ${item.price.toLocaleString()} экзпоинтов`,
        ephemeral: true
    });
}

// ========== ФУНКЦИИ БРАКА ==========

// Модальное окно с вводом участника для брака
async function showMarriagePartnerModal(interaction, userId) {
    const modal = new ModalBuilder()
        .setCustomId(`marriage_partner_modal:${userId}`)
        .setTitle('💍 Выбор партнёра для брака');

    const partnerInput = new TextInputBuilder()
        .setCustomId('partner_input')
        .setLabel('Укажи участника (ник, ID или упоминание)')
        .setPlaceholder('Например: @username')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setMinLength(2)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(partnerInput));

    await interaction.showModal(modal);
}

// Резолвим участника по нику / ID / упоминанию
async function resolveMember(guild, input) {
    if (!guild || !input) return null;
    const trimmed = input.trim();

    // Упоминание <@123> или <@!123>
    const mentionMatch = trimmed.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        return await guild.members.fetch(mentionMatch[1]).catch(() => null);
    }

    // Чистый ID
    if (/^\d{15,20}$/.test(trimmed)) {
        return await guild.members.fetch(trimmed).catch(() => null);
    }

    // По нику / отображаемому имени
    try {
        const members = [...(await guild.members.fetch({ query: trimmed, limit: 10 })).values()];
        const lower = trimmed.toLowerCase();
        return members.find(m => (m.displayName || m.user.username).toLowerCase() === lower)
            || members[0]
            || null;
    } catch (e) {
        return null;
    }
}

async function buyMarriage(client, interaction, userId, item, db) {
    // Проверяем, не в браке ли уже
    const existing = await db.get('SELECT * FROM marriages WHERE user1_id = ? OR user2_id = ?', userId, userId);
    if (existing) {
        return interaction.reply({ content: '❌ Вы уже в браке!', ephemeral: true });
    }

    // Проверяем, нет ли уже активного предложения
    const pending = await db.get('SELECT * FROM pending_marriages WHERE proposer_id = ?', userId);
    if (pending) {
        return interaction.reply({ content: '❌ У вас уже есть активное предложение! Дождитесь ответа.', ephemeral: true });
    }

    // Проверяем баланс
    const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
    if (!user || user.balance < item.price) {
        return interaction.reply({
            content: `❌ Недостаточно средств! Нужно ${item.price.toLocaleString()} экзпоинтов, у вас ${(user?.balance || 0).toLocaleString()} экзпоинтов`,
            ephemeral: true
        });
    }

    // Снимаем деньги
    await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', item.price, userId);

    // Открываем модальное окно с вводом участника
    await showMarriagePartnerModal(interaction, userId);
}

// Отправка предложения вступить в брак (после ввода участника в модальном окне)
async function sendMarriageProposal(client, interaction, buyerId, targetInput) {
    await interaction.deferReply({ ephemeral: true });

    const db = getDb();

    // Резолвим участника по нику / ID / упоминанию
    const target = await resolveMember(interaction.guild, targetInput);
    if (!target || target.user.bot) {
        return interaction.editReply({
            embeds: [createEmbed('❌ Участник не найден', [
                { name: 'Ввод', value: `\`\`\`${targetInput}\`\`\``, inline: false },
                { name: 'Как указать', value: 'Введи ник участника, его ID или упоминание — например `@username`.', inline: false }
            ])],
            components: []
        });
    }

    if (target.id === buyerId) {
        return interaction.editReply({
            embeds: [createEmbed('❌ Нельзя самому себе', [
                { name: 'Ошибка', value: 'Нельзя вступить в брак с самим собой!', inline: false }
            ])],
            components: []
        });
    }

    // Финальная проверка, что никто из пары не в браке
    const bothMarried = await db.get(
        'SELECT * FROM marriages WHERE user1_id IN (?, ?) OR user2_id IN (?, ?)',
        buyerId, target.id, buyerId, target.id
    );
    if (bothMarried) {
        return interaction.editReply({
            embeds: [createEmbed('❌ Кто-то уже в браке', [
                { name: 'Ошибка', value: 'Кто-то из вас уже состоит в браке!', inline: false }
            ])],
            components: []
        });
    }

    // Embed предложения в ЛС (в стиле остальных эмбедов)
    const embed = createEmbed('💘 Предложение вступить в брак!', [
        { name: 'Кто предлагает', value: `<@${buyerId}>`, inline: true },
        { name: 'Что вы получите', value: '💕 Любовная комната на двоих', inline: true },
        { name: 'Комната', value: 'Только для вас двоих, чужие зайти не смогут', inline: false }
    ]);

    const acceptRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`marriage_accept:${interaction.guild.id}:${buyerId}:${target.id}`)
            .setLabel('✅ Принять')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`marriage_decline:${interaction.guild.id}:${buyerId}:${target.id}`)
            .setLabel('❌ Отклонить')
            .setStyle(ButtonStyle.Danger)
    );

    try {
        const targetUser = await client.users.fetch(target.id);
        await targetUser.send({ embeds: [embed], components: [acceptRow] });
    } catch (error) {
        return interaction.editReply({
            embeds: [createEmbed('❌ Не удалось отправить предложение', [
                { name: 'Пользователь', value: `<@${target.id}>`, inline: true },
                { name: 'Причина', value: 'Возможно, у участника закрыты личные сообщения.', inline: false }
            ])],
            components: []
        });
    }

    // Записываем ожидающее предложение
    await db.run('DELETE FROM pending_marriages WHERE proposer_id = ?', buyerId);
    await db.run('INSERT INTO pending_marriages (proposer_id, target_id, expires_at) VALUES (?, ?, ?)',
        buyerId, target.id, Date.now() + 24 * 60 * 60 * 1000);

    await interaction.editReply({
        embeds: [createEmbed('💘 Предложение отправлено!', [
            { name: 'Кому', value: `<@${target.id}>`, inline: true },
            { name: 'Статус', value: 'Ожидаем ответа…', inline: true }
        ])],
        components: []
    });
}

// Принятие брака (кнопка в ЛС у получателя)
async function acceptMarriage(client, interaction, data) {
    const [guildId, buyerId, targetId] = data.split(':');

    if (interaction.user.id !== targetId) {
        return interaction.reply({
            content: '❌ Только получатель предложения может ответить!',
            ephemeral: true
        });
    }

    await interaction.deferUpdate();

    const db = getDb();

    // Проверяем, что никто из пары не в браке
    const bothMarried = await db.get(
        'SELECT * FROM marriages WHERE user1_id IN (?, ?) OR user2_id IN (?, ?)',
        buyerId, targetId, buyerId, targetId
    );
    if (bothMarried) {
        await interaction.editReply({
            embeds: [createEmbed('❌ Не удалось заключить брак', [
                { name: 'Причина', value: 'Кто-то из вас уже в браке.', inline: false }
            ])],
            components: []
        });
        return;
    }

    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
        await interaction.editReply({
            embeds: [createEmbed('❌ Сервер не найден', [
                { name: 'Причина', value: 'Обратитесь к администратору.', inline: false }
            ])],
            components: []
        });
        return;
    }

    const buyerMember = await guild.members.fetch(buyerId).catch(() => null);
    const targetMember = await guild.members.fetch(targetId).catch(() => null);

    const name1 = (buyerMember?.displayName || buyerId).slice(0, 45);
    const name2 = (targetMember?.displayName || targetId).slice(0, 45);
    const channelName = `${name1} <3 ${name2}`;

    // Создаём любовную комнату (everyone может просматривать, но заходить могут только супруги)
    let channel;
    try {
        channel = await guild.channels.create({
            name: channelName,
            type: 2,
            parent: config.MARRIAGE.LOVE_CATEGORY,
            userLimit: 2,
            permissionOverwrites: [
                { id: guild.id, allow: ['ViewChannel'], deny: ['Connect'] },
                { id: buyerId, allow: ['Connect', 'ViewChannel', 'ManageChannels', 'MuteMembers', 'DeafenMembers', 'MoveMembers'] },
                { id: targetId, allow: ['Connect', 'ViewChannel', 'ManageChannels', 'MuteMembers', 'DeafenMembers', 'MoveMembers'] }
            ]
        });
    } catch (error) {
        console.error('Ошибка при создании любовной комнаты:', error);
        await interaction.editReply({
            embeds: [createEmbed('❌ Не удалось создать комнату', [
                { name: 'Ошибка', value: `\`\`\`${error.message}\`\`\``, inline: false }
            ])],
            components: []
        });
        return;
    }

    // Сохраняем брак
    await db.run('INSERT INTO marriages (user1_id, user2_id, channel_id) VALUES (?, ?, ?)', buyerId, targetId, channel.id);

    // Удаляем ожидающее предложение
    await db.run('DELETE FROM pending_marriages WHERE (proposer_id = ? AND target_id = ?) OR (proposer_id = ? AND target_id = ?)',
        buyerId, targetId, targetId, buyerId);

    await logEconomy(client, '💍 Брак заключён!', [
        { name: 'Пара', value: `<@${buyerId}> и <@${targetId}>`, inline: true },
        { name: 'Любовная комната', value: channel.name, inline: true }
    ]);

    // Обновляем сообщение-предложение в ЛС получателя
    await interaction.editReply({
        embeds: [createEmbed('💍 Брак заключён!', [
            { name: 'Супруг(а)', value: `<@${buyerId}>`, inline: true },
            { name: 'Любовная комната', value: `**${channel.name}** 💕`, inline: true },
            { name: 'Поздравляем', value: 'Вы теперь в браке! Ваша комната только для вас двоих.', inline: false }
        ])],
        components: []
    });

    // Уведомляем покупателя в ЛС
    try {
        const buyerUser = await client.users.fetch(buyerId);
        await buyerUser.send({
            embeds: [createEmbed('💍 Ваше предложение принято!', [
                { name: 'Супруг(а)', value: `<@${targetId}>`, inline: true },
                { name: 'Любовная комната', value: `**${channel.name}** 💕`, inline: true },
                { name: 'Поздравляем', value: `<@${targetId}> согласился(ась) вступить с вами в брак!`, inline: false }
            ])]
        });
    } catch (e) {}
}

// Отклонение брака (кнопка в ЛС у получателя)
async function declineMarriage(client, interaction, data) {
    const [guildId, buyerId, targetId] = data.split(':');

    if (interaction.user.id !== targetId) {
        return interaction.reply({
            content: '❌ Только получатель предложения может ответить!',
            ephemeral: true
        });
    }

    await interaction.deferUpdate();

    const db = getDb();
    await db.run('DELETE FROM pending_marriages WHERE (proposer_id = ? AND target_id = ?) OR (proposer_id = ? AND target_id = ?)',
        buyerId, targetId, targetId, buyerId);

    // Обновляем сообщение-предложение в ЛС получателя
    await interaction.editReply({
        embeds: [createEmbed('❌ Предложение отклонено', [
            { name: 'Кто предлагал', value: `<@${buyerId}>`, inline: true },
            { name: 'Статус', value: 'Вы отклонили предложение вступить в брак.', inline: true }
        ])],
        components: []
    });

    // Уведомляем покупателя
    try {
        const buyerUser = await client.users.fetch(buyerId);
        await buyerUser.send({
            embeds: [createEmbed('❌ Предложение отклонено', [
                { name: 'Кто отклонил', value: `<@${targetId}>`, inline: true },
                { name: 'Дальнейшие действия', value: 'Вы можете купить брак снова в магазине `/shop`.', inline: false }
            ])]
        });
    } catch (e) {}
}

// ========== ФУНКЦИИ РАЗВОДА ==========

async function divorceConfirm(client, interaction, data) {
    const [guildId, userId] = data.split(':');

    if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Только вы можете подтвердить развод!', ephemeral: true });
    }

    await interaction.deferUpdate();

    const db = getDb();
    const marriage = await db.get('SELECT * FROM marriages WHERE user1_id = ? OR user2_id = ?', userId, userId);

    if (!marriage) {
        await interaction.editReply({
            embeds: [createEmbed('❌ Вы не в браке', [
                { name: 'Статус', value: 'Брак не найден — возможно, вы уже развелись.', inline: false }
            ])],
            components: []
        });
        return;
    }

    const partnerId = marriage.user1_id === userId ? marriage.user2_id : marriage.user1_id;

    // Удаляем голосовой канал любовной комнаты
    let channelDeleted = false;
    if (marriage.channel_id) {
        try {
            const channel = await client.channels.fetch(marriage.channel_id).catch(() => null);
            if (channel) {
                await channel.delete('Развод — любовная комната удалена');
                channelDeleted = true;
            }
        } catch (e) {
            console.error('Ошибка при удалении любовной комнаты:', e);
        }
    }

    await db.run('DELETE FROM marriages WHERE id = ?', marriage.id);

    await logEconomy(client, '💔 Развод', [
        { name: 'Пара', value: `<@${userId}> и <@${partnerId}>`, inline: true },
        { name: 'Комната', value: channelDeleted ? 'Удалена' : 'Не найдена', inline: true }
    ]);

    await interaction.editReply({
        embeds: [createEmbed('💔 Развод оформлен', [
            { name: 'Вы', value: `<@${userId}>`, inline: true },
            { name: 'Супруг(а)', value: `<@${partnerId}>`, inline: true },
            { name: 'Комната', value: channelDeleted ? '✅ Удалена' : '⚠️ Не найдена (могла быть удалена ранее)', inline: true }
        ])],
        components: []
    });

    // Уведомляем второго супруга в ЛС
    try {
        const partnerUser = await client.users.fetch(partnerId);
        await partnerUser.send({
            embeds: [createEmbed('💔 Ваш брак расторгнут', [
                { name: 'Инициатор', value: `<@${userId}>`, inline: true },
                { name: 'Комната', value: channelDeleted ? '✅ Удалена' : '⚠️ Не найдена', inline: true },
                { name: 'Статус', value: 'Теперь вы свободны.', inline: false }
            ])]
        });
    } catch (e) {}
}

async function divorceCancel(client, interaction, data) {
    const [guildId, userId] = data.split(':');

    if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Только вы можете отменить развод!', ephemeral: true });
    }

    await interaction.deferUpdate();

    await interaction.editReply({
        embeds: [createEmbed('✅ Развод отменён', [
            { name: 'Статус', value: 'Вы остались в браке 💍', inline: false }
        ])],
        components: []
    });
}

// ========== ФУНКЦИИ РЕДАКТИРОВАНИЯ РОЛИ ==========

async function showEditNameModal(interaction, roleId) {
    const modal = new ModalBuilder()
        .setCustomId(`edit_name_modal:${roleId}`)
        .setTitle('✏️ Изменить название роли');
    
    const nameInput = new TextInputBuilder()
        .setCustomId('new_name')
        .setLabel('Новое название роли')
        .setPlaceholder('Введи новое название (максимум 32 символа)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setMinLength(2)
        .setRequired(true);
    
    const row = new ActionRowBuilder().addComponents(nameInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
}

async function showColorMenuForEdit(interaction, roleId) {
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
        
        if (buttonCount === 3) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
            buttonCount = 0;
        }
    }
    
    if (buttonCount > 0) {
        rows.push(currentRow);
    }
    
    await interaction.update({
        content: '🎨 **Выбери новый цвет для своей роли:**',
        components: rows,
        embeds: [],
        ephemeral: true
    });
}

async function editRoleColor(interaction, roleId, colorHex, colorName) {
    try {
        const db = getDb();
        const role = await interaction.guild.roles.fetch(roleId);
        const userRole = await db.get('SELECT * FROM user_roles WHERE role_id = ?', roleId);
        
        if (!role) {
            return interaction.reply({ content: '❌ Роль не найдена!', ephemeral: true });
        }
        
        await role.setColor(colorHex);
        await db.run('UPDATE user_roles SET color_hex = ? WHERE role_id = ?', colorHex, roleId);
        
        await logEconomy(interaction.client, '✏️ Изменение цвета роли', [
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
        await interaction.reply({ content: `❌ Ошибка: ${error.message}`, ephemeral: true });
    }
}

async function editRoleHoist(interaction, roleId) {
    try {
        const db = getDb();
        const role = await interaction.guild.roles.fetch(roleId);
        const userRole = await db.get('SELECT * FROM user_roles WHERE role_id = ?', roleId);
        
        if (!role) {
            return interaction.reply({ content: '❌ Роль не найдена!', ephemeral: true });
        }
        
        const newHoist = !role.hoist;
        await role.setHoist(newHoist);
        
        await logEconomy(interaction.client, '✏️ Изменение отображения роли', [
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
        await interaction.reply({ content: `❌ Ошибка: ${error.message}`, ephemeral: true });
    }
}

async function resetRoleSettings(interaction, roleId) {
    try {
        const db = getDb();
        const role = await interaction.guild.roles.fetch(roleId);
        const userRole = await db.get('SELECT * FROM user_roles WHERE role_id = ?', roleId);
        const member = await interaction.guild.members.fetch(userRole.user_id);
        
        if (!role) {
            return interaction.reply({ content: '❌ Роль не найдена!', ephemeral: true });
        }
        
        await role.setName(`Владелец: ${member.displayName}`);
        await role.setColor('#808080');
        await role.setHoist(false);
        
        await db.run('UPDATE user_roles SET role_name = ?, color_hex = ? WHERE role_id = ?', 
            `Владелец: ${member.displayName}`, '#808080', roleId);
        
        await logEconomy(interaction.client, '✏️ Сброс настроек роли', [
            { name: 'Пользователь', value: `<@${userRole.user_id}>`, inline: true },
            { name: 'Действие', value: 'Сброс всех настроек', inline: true }
        ]);
        
        await interaction.update({
            content: `✅ Настройки роли сброшены до стандартных!\n📝 Название: Владелец: ${member.displayName}\n🎨 Цвет: Серый\n📋 Отдельный список: Выключен`,
            components: [],
            embeds: [],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Ошибка при сбросе настроек:', error);
        await interaction.reply({ content: `❌ Ошибка: ${error.message}`, ephemeral: true });
    }
}

async function editRoleName(interaction, roleId, newName) {
    // НЕ вызываем deferReply или reply здесь, так как это уже сделано в index.js
    try {
        const db = getDb();
        const role = await interaction.guild.roles.fetch(roleId);
        const userRole = await db.get('SELECT * FROM user_roles WHERE role_id = ?', roleId);
        
        if (!role) {
            return interaction.editReply({ content: '❌ Роль не найдена!', ephemeral: true });
        }
        
        const invalidChars = /[<>@&\/\\#]|@everyone|@here/gi;
        if (invalidChars.test(newName)) {
            return interaction.editReply({ content: '❌ Название содержит запрещённые символы!', ephemeral: true });
        }
        
        const oldName = role.name;
        await role.setName(newName);
        await db.run('UPDATE user_roles SET role_name = ? WHERE role_id = ?', newName, roleId);
        
        await logEconomy(interaction.client, '✏️ Изменение названия роли', [
            { name: 'Пользователь', value: `<@${userRole.user_id}>`, inline: true },
            { name: 'Было название', value: oldName, inline: true },
            { name: 'Стало название', value: newName, inline: true }
        ]);
        
        await interaction.editReply({
            content: `✅ Название роли изменено с **${oldName}** на **${newName}**!`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Ошибка при изменении названия:', error);
        await interaction.editReply({ content: `❌ Ошибка: ${error.message}`, ephemeral: true });
    }
}async function editRoleName(interaction, roleId, newName) {
    // НЕ вызываем deferReply или reply здесь, так как это уже сделано в index.js
    try {
        const db = getDb();
        const role = await interaction.guild.roles.fetch(roleId);
        const userRole = await db.get('SELECT * FROM user_roles WHERE role_id = ?', roleId);
        
        if (!role) {
            return interaction.editReply({ content: '❌ Роль не найдена!', ephemeral: true });
        }
        
        const invalidChars = /[<>@&\/\\#]|@everyone|@here/gi;
        if (invalidChars.test(newName)) {
            return interaction.editReply({ content: '❌ Название содержит запрещённые символы!', ephemeral: true });
        }
        
        const oldName = role.name;
        await role.setName(newName);
        await db.run('UPDATE user_roles SET role_name = ? WHERE role_id = ?', newName, roleId);
        
        await logEconomy(interaction.client, '✏️ Изменение названия роли', [
            { name: 'Пользователь', value: `<@${userRole.user_id}>`, inline: true },
            { name: 'Было название', value: oldName, inline: true },
            { name: 'Стало название', value: newName, inline: true }
        ]);
        
        await interaction.editReply({
            content: `✅ Название роли изменено с **${oldName}** на **${newName}**!`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Ошибка при изменении названия:', error);
        await interaction.editReply({ content: `❌ Ошибка: ${error.message}`, ephemeral: true });
    }
}

// ========== ФУНКЦИИ ДУЭЛЕЙ ==========

async function acceptDuel(client, interaction, duelId) {
    const duel = duels.get(duelId);
    if (!duel) {
        return interaction.reply({
            content: '❌ Дуэль не найдена или истекла',
            ephemeral: true
        });
    }
    
    // Если вызывающий дуэль пытается её принять - отправляем отдельное сообщение
    if (interaction.user.id === duel.challenger) {
        return interaction.reply({
            content: '❌ Вы не можете принять собственную дуэль! Ожидайте, пока её примет противник.',
            ephemeral: true
        });
    }
    
    if (interaction.user.id !== duel.opponent) {
        return interaction.reply({
            content: '❌ Это не ваш вызов!',
            ephemeral: true
        });
    }
    
    // Делаем deferUpdate только для правильного участника
    await interaction.deferUpdate();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`duel_rock:${duelId}`).setLabel('🪨 Камень').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`duel_paper:${duelId}`).setLabel('📄 Бумага').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`duel_scissors:${duelId}`).setLabel('✂️ Ножницы').setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.editReply({
        embeds: [createEmbed('ДУЭЛЬ НАЧАЛАСЬ!', [
            { name: 'Противники', value: `<@${duel.challenger}> vs <@${duel.opponent}>`, inline: true },
            { name: 'Ставка', value: `\`\`\`${duel.amount.toLocaleString()} экзпоинтов\`\`\``, inline: true },
            { name: 'Выберите оружие', value: 'Нажмите на кнопку ниже', inline: false },
            { name: 'Статус', value: ` <@${duel.challenger}> ожидает выбора...\n <@${duel.opponent}> ожидает выбора...`, inline: false }
        ], 0x1A1C1E)],
        components: [row],
        content: null,
        files: []
    });
}

async function playRockPaperScissors(client, interaction, action, duelId) {
    const duel = duels.get(duelId);
    if (!duel) {
        return interaction.reply({
            content: '❌ Дуэль не найдена или уже завершена',
            ephemeral: true
        });
    }
    
    const userChoice = action;
    const userId = interaction.user.id;
    
    // Сохраняем выбор игрока
    if (userId === duel.challenger && !duel.challengerChoice) {
        duel.challengerChoice = userChoice;
        await interaction.reply({
            content: `✅ Вы выбрали **${userChoice}**! Ожидаем выбора противника...`,
            ephemeral: true
        });
    } else if (userId === duel.opponent && !duel.opponentChoice) {
        duel.opponentChoice = userChoice;
        await interaction.reply({
            content: `✅ Вы выбрали **${userChoice}**! Ожидаем выбора противника...`,
            ephemeral: true
        });
    } else {
        return interaction.reply({
            content: '❌ Вы уже сделали выбор или это не ваша дуэль!',
            ephemeral: true
        });
    }
    
    // Обновляем статус в основном сообщении (если сообщение существует)
    const challengerStatus = duel.challengerChoice ? '✅ СДЕЛАЛ ВЫБОР' : '⏳ ОЖИДАЕТ ВЫБОРА';
    const opponentStatus = duel.opponentChoice ? '✅ СДЕЛАЛ ВЫБОР' : '⏳ ОЖИДАЕТ ВЫБОРА';
    
    const channel = await client.channels.fetch(duel.channelId);
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`duel_rock:${duelId}`).setLabel('🪨 Камень').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`duel_paper:${duelId}`).setLabel('📄 Бумага').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`duel_scissors:${duelId}`).setLabel('✂️ Ножницы').setStyle(ButtonStyle.Secondary)
        );
    
    try {
        const originalMessage = await channel.messages.fetch(duel.messageId);
        if (originalMessage) {
            await originalMessage.edit({
                embeds: [createEmbed('ДУЭЛЬ НАЧАЛАСЬ!', [
                    { name: 'Противники', value: `<@${duel.challenger}> vs <@${duel.opponent}>`, inline: true },
                    { name: 'Ставка', value: `\`\`\`${duel.amount.toLocaleString()} экзпоинтов\`\`\``, inline: true },
                    { name: 'Выберите оружие', value: 'Нажмите на кнопку ниже', inline: false },
                    { name: 'Статус', value: ` <@${duel.challenger}>: ${challengerStatus}\n <@${duel.opponent}>: ${opponentStatus}`, inline: false }
                ], 0x1A1C1E)],
                components: [row],
                content: null
            });
        }
    } catch (e) {
        // Если сообщение не найдено, создаём новое
        console.log('Сообщение дуэли не найдено, создаём новое');
        try {
            const newMessage = await channel.send({
                embeds: [createEmbed('ДУЭЛЬ НАЧАЛАСЬ!', [
                    { name: 'Противники', value: `<@${duel.challenger}> vs <@${duel.opponent}>`, inline: true },
                    { name: 'Ставка', value: `\`\`\`${duel.amount.toLocaleString()} экзпоинтов\`\`\``, inline: true },
                    { name: 'Выберите оружие', value: 'Нажмите на кнопку ниже', inline: false },
                    { name: 'Статус', value: ` <@${duel.challenger}>: ${challengerStatus}\n <@${duel.opponent}>: ${opponentStatus}`, inline: false }
                ], 0x1A1C1E)],
                components: [row]
            });
            duel.messageId = newMessage.id;
        } catch (err) {
            console.log('Не удалось создать новое сообщение дуэли');
        }
    }
    
    // Проверяем, сделали ли оба выбора
    if (duel.challengerChoice && duel.opponentChoice) {
        await finishDuel(client, interaction, duelId, duel);
    }
}

async function finishDuel(client, interaction, duelId, duel) {
    const db = getDb();
    const winner = determineWinner(duel.challengerChoice, duel.opponentChoice);
    
    let resultFields = [];
    let embedTitle = '';
    let isWin = false;
    
    if (winner === 'challenger') {
        const winAmount = Math.floor(duel.amount * 0.95);
        const commission = duel.amount - winAmount;
        await db.run('UPDATE users SET balance = balance + ?, total_won_duels = total_won_duels + 1 WHERE user_id = ?', winAmount, duel.challenger);
        await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', duel.amount, duel.opponent);
        await distributeCommission(client, commission);

        isWin = true;
        embedTitle = 'РЕЗУЛЬТАТ!';
        resultFields = [
            { name: 'Победитель', value: `<@${duel.challenger}>`, inline: true },
            { name: 'Проигравший', value: `<@${duel.opponent}>`, inline: true },
            { name: 'Выбор победителя', value: `\`\`\`${duel.challengerChoice}\`\`\``, inline: true },
            { name: 'Выбор проигравшего', value: `\`\`\`${duel.opponentChoice}\`\`\``, inline: true },
            { name: 'Выигрыш', value: `\`\`\`${winAmount.toLocaleString()} экзпоинтов\`\`\``, inline: true }
        ];

        await logEconomy(client, 'Результат дуэли', [
            { name: 'Победитель', value: `<@${duel.challenger}>`, inline: true },
            { name: 'Проигравший', value: `<@${duel.opponent}>`, inline: true },
            { name: 'Выигрыш', value: `${winAmount} экзпоинтов`, inline: true }
        ]);

    } else if (winner === 'opponent') {
        const winAmount = Math.floor(duel.amount * 0.95);
        const commission = duel.amount - winAmount;
        await db.run('UPDATE users SET balance = balance + ?, total_won_duels = total_won_duels + 1 WHERE user_id = ?', winAmount, duel.opponent);
        await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', duel.amount, duel.challenger);
        await distributeCommission(client, commission);

        isWin = true;
        embedTitle = 'РЕЗУЛЬТАТ!';
        resultFields = [
            { name: 'Победитель', value: `<@${duel.opponent}>`, inline: true },
            { name: 'Проигравший', value: `<@${duel.challenger}>`, inline: true },
            { name: 'Выбор победителя', value: `\`\`\`${duel.opponentChoice}\`\`\``, inline: true },
            { name: 'Выбор проигравшего', value: `\`\`\`${duel.challengerChoice}\`\`\``, inline: true },
            { name: 'Выигрыш', value: `\`\`\`${winAmount.toLocaleString()} экзпоинтов\`\`\``, inline: true }
        ];

        await logEconomy(client, 'Результат дуэли', [
            { name: 'Победитель', value: `<@${duel.opponent}>`, inline: true },
            { name: 'Проигравший', value: `<@${duel.challenger}>`, inline: true },
            { name: 'Выигрыш', value: `${winAmount} экзпоинтов`, inline: true }
        ]);
        
    } else {
        embedTitle = 'НИЧЬЯ!';
        resultFields = [
            { name: 'Оба выбрали', value: `\`\`\`${duel.challengerChoice}\`\`\``, inline: true },
            { name: 'Ставка', value: `\`\`\`${duel.amount.toLocaleString()} экзпоинтов возвращена\`\`\``, inline: true }
        ];
    }
    
    const channel = await client.channels.fetch(duel.channelId);
    const originalMessage = await channel.messages.fetch(duel.messageId);
    
    if (isWin) {
        // ПРИ ПОБЕДЕ - ГИФКА ПОБЕДЫ
        const gifData = getGifForEmbed('win');
        
        const resultEmbed = {
            title: embedTitle,
            color: 0x1A1C1E,
            image: gifData ? { url: gifData.url } : null,
            fields: resultFields,
            timestamp: new Date(),
            footer: { text: 'Экономическая система | экзпоинты' }
        };
        
        await originalMessage.edit({
            embeds: [resultEmbed],
            files: gifData ? [gifData.attachment] : [],
            attachments: [],
            components: [],
            content: null
        });
    } else {
        // НИЧЬЯ
        const gifData = getGifForEmbed('draw') || getGifForEmbed('lose');
        const resultEmbed = {
            title: embedTitle,
            color: 0x1A1C1E,
            image: gifData ? { url: gifData.url } : null,
            fields: resultFields,
            timestamp: new Date(),
            footer: { text: 'Экономическая система | экзпоинты' }
        };
        
        await originalMessage.edit({
            embeds: [resultEmbed],
            files: gifData ? [gifData.attachment] : [],
            attachments: [],
            components: [],
            content: null
        });
    }
    
    duels.delete(duelId);
}

// ========== ФУНКЦИИ ОГРАБЛЕНИЙ ==========

async function robberyPay(client, interaction) {
    const db = getDb();
    const user = await db.get('SELECT balance FROM users WHERE user_id = ?', interaction.user.id);
    
    if (!user || user.balance < 15000) {
        return interaction.reply({
            embeds: [createEmbed('❌ Ошибка', [{ name: '', value: 'Недостаточно средств, чтобы заплатить!', inline: false }], 0x1A1C1E)],
            ephemeral: true
        });
    }
    
    await db.run('UPDATE users SET balance = balance - 15000 WHERE user_id = ?', interaction.user.id);
    
    await interaction.update({
        embeds: [createEmbed('💰 Вы заплатили грабителям', [
            { name: 'Сумма', value: '-15,000 экзпоинтов', inline: true },
            { name: 'Новый баланс', value: `${user.balance - 15000} экзпоинтов`, inline: true }
        ], 0x1A1C1E)],
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
            ], 0x1A1C1E)],
            components: []
        });
    }
}


// ========== ФУНКЦИИ УПРАВЛЕНИЯ КОМНАТОЙ ==========

async function getActiveRoomForUser(db, guild, userId) {
    const nowSec = Math.floor(Date.now() / 1000);

    // 1. Проверяем личную комнату из подписок (сначала активные по времени, если нет - берем последнюю запись пользователя)
    let subscription = await db.get(
        'SELECT * FROM subscriptions WHERE user_id = ? AND type = ? AND expires_at > ? ORDER BY id DESC LIMIT 1',
        userId, 'private_room', nowSec
    );

    if (!subscription) {
        subscription = await db.get(
            'SELECT * FROM subscriptions WHERE user_id = ? AND type = ? ORDER BY id DESC LIMIT 1',
            userId, 'private_room'
        );
    }

    if (subscription && subscription.channel_id) {
        let channel = guild.channels.cache.get(subscription.channel_id);
        if (!channel) {
            channel = await guild.channels.fetch(subscription.channel_id).catch(() => null);
        }
        if (channel) {
            return {
                channel,
                channelId: channel.id,
                type: 'private_room',
                ownerId: userId,
                expiresAt: subscription.expires_at
            };
        }
    }

    // 2. Проверяем любовную комнату из брака
    const marriage = await db.get(
        'SELECT * FROM marriages WHERE (user1_id = ? OR user2_id = ?) AND channel_id IS NOT NULL ORDER BY id DESC LIMIT 1',
        userId, userId
    );

    if (marriage && marriage.channel_id) {
        let channel = guild.channels.cache.get(marriage.channel_id);
        if (!channel) {
            channel = await guild.channels.fetch(marriage.channel_id).catch(() => null);
        }
        if (channel) {
            return {
                channel,
                channelId: channel.id,
                type: 'marriage',
                ownerId: userId,
                isMarriage: true
            };
        }
    }

    return null;
}

async function showRoomNameModal(interaction, channelId, ownerId) {
    const modal = new ModalBuilder()
        .setCustomId(`room_name_modal:${channelId}:${ownerId}`)
        .setTitle('✏️ Изменить название комнаты');
    
    const nameInput = new TextInputBuilder()
        .setCustomId('new_name')
        .setLabel('Новое название комнаты')
        .setPlaceholder('Введи новое название (максимум 32 символа)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setMinLength(2)
        .setRequired(true);
    
    const row = new ActionRowBuilder().addComponents(nameInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
}

async function showRoomLimitModal(interaction, channelId, ownerId) {
    const modal = new ModalBuilder()
        .setCustomId(`room_limit_modal:${channelId}:${ownerId}`)
        .setTitle('👥 Лимит участников');
    
    const limitInput = new TextInputBuilder()
        .setCustomId('new_limit')
        .setLabel('Лимит участников (0-99)')
        .setPlaceholder('0 - безлимит, 1-99 - максимальное количество')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(2)
        .setRequired(true);
    
    const row = new ActionRowBuilder().addComponents(limitInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
}

async function showRoomKickMenu(interaction, channelId, ownerId) {
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
        return interaction.reply({
            content: '❌ Голосовой канал комнаты не найден на сервере!',
            ephemeral: true
        });
    }
    
    const members = channel.members.filter(m => m.id !== interaction.user.id);
    if (members.size === 0) {
        return interaction.reply({
            content: '❌ В вашей комнате сейчас нет других участников для кика.',
            ephemeral: true
        });
    }
    
    const row = new ActionRowBuilder();
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`room_kick_select:${channelId}:${ownerId}`)
        .setPlaceholder('Выберите участника для исключения')
        .addOptions(
            members.map(member => ({
                label: (member.displayName || member.user.username).slice(0, 25),
                description: `@${member.user.username}`.slice(0, 50),
                value: member.id,
            })).slice(0, 25)
        );
    
    row.addComponents(selectMenu);
    
    await interaction.reply({
        content: '🚪 **Выберите участника, которого хотите кикнуть из комнаты:**',
        components: [row],
        ephemeral: true
    });
}

async function closeRoom(interaction, channelId, ownerId) {
    let channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
        channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    }
    
    if (!channel) {
        return interaction.reply({
            content: '❌ Голосовой канал комнаты не найден на сервере!',
            ephemeral: true
        });
    }
    
    // Проверяем текущее состояние закрытия для @everyone
    const everyoneOverwrite = channel.permissionOverwrites.cache.get(interaction.guild.id);
    const roomIsLocked = everyoneOverwrite?.deny?.has('Connect') === true;
    
    if (roomIsLocked) {
        // Открываем комнату: разрешаем вход всем (@everyone Connect: true или null)
        await channel.permissionOverwrites.edit(interaction.guild.id, {
            Connect: true,
            ViewChannel: true
        });
        
        await interaction.reply({
            content: '🔓 **Комната открыта!** Теперь другие участники сервера могут заходить в неё.',
            ephemeral: true
        });
    } else {
        // Закрываем комнату: запрещаем Connect для @everyone
        await channel.permissionOverwrites.edit(interaction.guild.id, {
            Connect: false,
            ViewChannel: true
        });
        
        await interaction.reply({
            content: '🔒 **Комната закрыта!** Новые участники не смогут войти без разрешения владельца.',
            ephemeral: true
        });
    }
}


// Экспорты
module.exports.duels = duels;
module.exports.createCustomRole = createCustomRole;
module.exports.editRoleName = editRoleName;
module.exports.buyMarriage = buyMarriage;
module.exports.sendMarriageProposal = sendMarriageProposal;