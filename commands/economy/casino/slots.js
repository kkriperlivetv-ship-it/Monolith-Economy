// Подключаем необходимые модули
const { SlashCommandBuilder } = require('discord.js');        // Для создания slash-команд
const { getDb } = require('../../../database');               // Для работы с базой данных
const { renderCasinoResult, sendImageEmbed } = require('../../../utils/imageGenerator');  // Для генерации картинки
const { logEconomy } = require('../../../utils/logger');      // Для логирования крупных выигрышей

module.exports = {
    // Регистрация команды в Discord
    data: new SlashCommandBuilder()
        .setName('slots')                                      // Название команды
        .setDescription('🎰 Сыграть в слоты')                   // Описание команды
        .addIntegerOption(option =>                            // Добавляем опцию - число
            option.setName('amount')                           // Название опции
                .setDescription('💰 Ставка')                    // Описание опции
                .setRequired(true)                             // Обязательная опция
                .setMinValue(1)                                // Минимальное значение 1
        ),
    
    // Функция, которая выполняется при вызове команды
    async execute(client, interaction) {
        // Откладываем ответ, так как генерация картинки может занять время
        await interaction.deferReply();
        
        try {
            // Получаем ID пользователя, который вызвал команду
            const userId = interaction.user.id;
            
            // Получаем сумму ставки из опций команды
            const amount = interaction.options.getInteger('amount');
            
            // Подключаемся к базе данных
            const db = getDb();
            
            // Ищем пользователя в базе данных и получаем его баланс
            const user = await db.get('SELECT balance FROM users WHERE user_id = ?', userId);
            
            // Проверяем: есть ли пользователь и хватает ли у него средств
            if (!user || user.balance < amount) {
                return interaction.editReply({ 
                    content: '❌ Недостаточно средств для игры!', 
                    embeds: [], 
                    files: [] 
                });
            }
            
            // ========== НАСТРОЙКА СИМВОЛОВ ДЛЯ СЛОТОВ ==========
            // Каждый символ имеет: эмодзи, название, множитель и цвет
            const slotSymbols = [
                { emoji: '🍒', name: 'Вишня', value: 2 },      // Частый символ
                { emoji: '🍊', name: 'Апельсин', value: 3 },    // Частый символ
                { emoji: '🍋', name: 'Лимон', value: 4 },       // Частый символ
                { emoji: '🍉', name: 'Арбуз', value: 5 },       // Средний символ
                { emoji: '🔔', name: 'Колокольчик', value: 10 }, // Редкий символ
                { emoji: '⭐', name: 'Звезда', value: 15 },      // Редкий символ
                { emoji: '💎', name: 'Алмаз', value: 20 },       // Очень редкий
                { emoji: '👑', name: 'Корона', value: 25 },      // Очень редкий
                { emoji: '7️⃣', name: 'Семёрка', value: 30 },     // Экстра редкий
                { emoji: '💰', name: 'Мешок денег', value: 50 }  // Джекпот символ
            ];
            
            // ========== ФУНКЦИЯ ВЫБОРА СЛУЧАЙНОГО СИМВОЛА С РАЗНЫМИ ВЕСАМИ ==========
            // Редкие символы выпадают реже, частые - чаще
            function getRandomSymbol() {
                const rand = Math.random() * 100;  // Случайное число от 0 до 100
                
                // Распределение вероятностей (чем больше процент, тем чаще выпадает)
                if (rand < 40) return slotSymbols[0];   // 40% - Вишня 🍒
                if (rand < 65) return slotSymbols[1];   // 25% - Апельсин 🍊
                if (rand < 80) return slotSymbols[2];   // 15% - Лимон 🍋
                if (rand < 90) return slotSymbols[3];   // 10% - Арбуз 🍉
                if (rand < 95) return slotSymbols[4];   // 5%  - Колокольчик 🔔
                if (rand < 97) return slotSymbols[5];   // 2%  - Звезда ⭐
                if (rand < 98.5) return slotSymbols[6]; // 1.5% - Алмаз 💎
                if (rand < 99.5) return slotSymbols[7]; // 1%   - Корона 👑
                if (rand < 99.9) return slotSymbols[8]; // 0.4% - Семёрка 7️⃣
                return slotSymbols[9];                   // 0.1% - Мешок денег 💰
            }
            
            // Генерируем 3 случайных символа
            const slot1 = getRandomSymbol();
            const slot2 = getRandomSymbol();
            const slot3 = getRandomSymbol();
            
            // Сохраняем результаты для отображения
            const results = [slot1.emoji, slot2.emoji, slot3.emoji];
            
            // ========== РАСЧЁТ ВЫИГРЫША ==========
            let multiplier = 0;        // Множитель выигрыша
            let winDescription = '';   // Описание выигрыша
            
            // Проверяем комбинации (от самой редкой к самой частой)
            
            // 1. ДЖЕКПОТ - три алмаза 💎💎💎
            if (slot1.emoji === '💎' && slot2.emoji === '💎' && slot3.emoji === '💎') {
                multiplier = 50;
                winDescription = '💎 ДЖЕКПОТ! x50 💎';
            }
            // 2. Королевский выигрыш - три короны 👑👑👑
            else if (slot1.emoji === '👑' && slot2.emoji === '👑' && slot3.emoji === '👑') {
                multiplier = 40;
                winDescription = '👑 КОРОЛЕВСКИЙ ВЫИГРЫШ! x40 👑';
            }
            // 3. Денежный выигрыш - три мешка с деньгами 💰💰💰
            else if (slot1.emoji === '💰' && slot2.emoji === '💰' && slot3.emoji === '💰') {
                multiplier = 35;
                winDescription = '💰 МЕШОК ДЕНЕГ! x35 💰';
            }
            // 4. Счастливый выигрыш - три семёрки 7️⃣7️⃣7️⃣
            else if (slot1.emoji === '7️⃣' && slot2.emoji === '7️⃣' && slot3.emoji === '7️⃣') {
                multiplier = 30;
                winDescription = '🎰 СЧАСТЛИВЧИК! x30 🎰';
            }
            // 5. Любые три одинаковых символа
            else if (slot1.emoji === slot2.emoji && slot2.emoji === slot3.emoji) {
                multiplier = slot1.value;
                winDescription = `✨ ТРИ ${slot1.name.toUpperCase()}! x${multiplier} ✨`;
            }
            // 6. Два одинаковых символа
            else if (slot1.emoji === slot2.emoji || slot2.emoji === slot3.emoji || slot1.emoji === slot3.emoji) {
                // Определяем, какой символ выпал дважды
                let matchedSymbol;
                if (slot1.emoji === slot2.emoji) matchedSymbol = slot1;
                else if (slot2.emoji === slot3.emoji) matchedSymbol = slot2;
                else matchedSymbol = slot3;
                
                multiplier = Math.floor(matchedSymbol.value / 2);
                winDescription = `🌟 ПАРА ${matchedSymbol.name.toUpperCase()}! x${multiplier} 🌟`;
            }
            // 7. Бонусная комбинация - Вишня + Арбуз + Вишня 🍒🍉🍒
            else if (slot1.emoji === '🍒' && slot2.emoji === '🍉' && slot3.emoji === '🍒') {
                multiplier = 8;
                winDescription = '🍒 ВИШНЯ-АРБУЗНЫЙ БОНУС! x8 🍉';
            }
            // 8. Бонусная комбинация - Колокольчик + Звезда + Колокольчик 🔔⭐🔔
            else if (slot1.emoji === '🔔' && slot2.emoji === '⭐' && slot3.emoji === '🔔') {
                multiplier = 12;
                winDescription = '🔔 ЗВЁЗДНЫЙ КОЛОКОЛЬЧИК! x12 ⭐';
            }
            
            // Рассчитываем сумму выигрыша
            const winAmount = amount * multiplier;
            
            // ========== ОБРАБОТКА ПЛАТЕЖЕЙ ==========
            // Снимаем ставку с баланса
            await db.run('UPDATE users SET balance = balance - ? WHERE user_id = ?', amount, userId);
            
            // Если есть выигрыш - начисляем
            if (winAmount > 0) {
                await db.run('UPDATE users SET balance = balance + ? WHERE user_id = ?', winAmount, userId);
                
                // Если выигрыш больше 10,000 - логируем в канал
                if (winAmount >= 10000) {
                    await logEconomy(client, '🎰 КРУПНЫЙ ВЫИГРЫШ В КАЗИНО', [
                        { name: 'Игрок', value: `<@${userId}>`, inline: true },
                        { name: 'Игра', value: 'Слоты', inline: true },
                        { name: 'Ставка', value: `${amount} экзпоинтов`, inline: true },
                        { name: 'Выигрыш', value: `${winAmount} экзпоинтов`, inline: true },
                        { name: 'Множитель', value: `x${multiplier}`, inline: true }
                    ]);
                }
            }
            
            // ========== ГЕНЕРАЦИЯ КАРТИНКИ ==========
            // Подготавливаем данные для отрисовки
            const details = { 
                results,                    // Массив с эмодзи [🍒, 🍊, 🍋]
                multiplier,                 // Множитель выигрыша
                winDescription,             // Текстовое описание комбинации
                isWin: winAmount > 0        // Флаг победы
            };
            
            // Генерируем картинку
            const canvas = await renderCasinoResult('Слоты', amount, winAmount > 0, winAmount, details);
            
            // Отправляем картинку в чат
            await sendImageEmbed(interaction, canvas, 
                winAmount > 0 ? '🎉 ПОБЕДА В СЛОТАХ! 🎉' : '😔 ПРОИГРЫШ В СЛОТАХ', 
                '#0B0B0C'
            );
            
        } catch (error) {
            // Если произошла ошибка - выводим в консоль и сообщаем пользователю
            console.error('Ошибка в slots:', error);
            await interaction.editReply({ 
                content: '❌ Ошибка при игре в слоты', 
                embeds: [], 
                files: [] 
            });
        }
    }
};