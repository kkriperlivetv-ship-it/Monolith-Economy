const { getDb } = require('../database');
const config = require('../config');
const { awardXp } = require('../utils/levelSystem');

// Хранилище для отслеживания времени в голосовых каналах
const voiceTimers = new Map();

module.exports = async (client, oldState, newState) => {
    if (!config.ACTIVITY.VOICE_REWARD) return;
    if (newState.member.user.bot) return;
    
    const userId = newState.member.id;
    const db = getDb();
    const now = Date.now();
    
    // Пользователь ЗАШЁЛ в голосовой канал
    if (newState.channelId && !oldState.channelId) {
        console.log(`[VOICE] ${newState.member.user.username} зашёл в голосовой канал ${newState.channel?.name || 'unknown'}`);
        
        // Сохраняем время входа
        voiceTimers.set(userId, {
            startTime: now,
            channelId: newState.channelId
        });
        
        // Обновляем последний сброс, если нужно
        const user = await db.get('SELECT last_voice_reset FROM users WHERE user_id = ?', userId);
        if (!user || !user.last_voice_reset || now - user.last_voice_reset > 24 * 60 * 60 * 1000) {
            await db.run('UPDATE users SET voice_minutes_today = 0, last_voice_reset = ? WHERE user_id = ?', now, userId);
        }
    }
    
    // Пользователь ВЫШЕЛ из голосового канала
    if (!newState.channelId && oldState.channelId) {
        const timer = voiceTimers.get(userId);
        
        if (timer) {
            const elapsedMs = now - timer.startTime;
            const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
            
            console.log(`[VOICE] ${newState.member.user.username} вышел из голосового канала. Провёл: ${elapsedMinutes} минут`);
            
            if (elapsedMinutes > 0) {
                await addVoiceReward(client, userId, elapsedMinutes);
            }
            
            voiceTimers.delete(userId);
        }
    }
    
    // Пользователь ПЕРЕШЁЛ из одного канала в другой
    if (newState.channelId && oldState.channelId && newState.channelId !== oldState.channelId) {
        const timer = voiceTimers.get(userId);
        
        if (timer) {
            const elapsedMs = now - timer.startTime;
            const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
            
            console.log(`[VOICE] ${newState.member.user.username} перешёл из канала. Провёл: ${elapsedMinutes} минут в предыдущем`);
            
            if (elapsedMinutes > 0) {
                await addVoiceReward(client, userId, elapsedMinutes);
            }
            
            // Обновляем время для нового канала
            voiceTimers.set(userId, {
                startTime: now,
                channelId: newState.channelId
            });
        }
    }
};

async function addVoiceReward(client, userId, minutes) {
    const db = getDb();
    const now = Date.now();
    
    try {
        // Получаем пользователя
        let user = await db.get('SELECT voice_minutes_today, total_voice_minutes FROM users WHERE user_id = ?', userId);
        
        if (!user) {
            await db.run('INSERT INTO users (user_id) VALUES (?)', userId);
            user = { voice_minutes_today: 0, total_voice_minutes: 0 };
        }
        
        // Проверяем сброс ежедневного счётчика
        const resetCheck = await db.get('SELECT last_voice_reset FROM users WHERE user_id = ?', userId);
        if (!resetCheck || !resetCheck.last_voice_reset || now - resetCheck.last_voice_reset > 24 * 60 * 60 * 1000) {
            await db.run('UPDATE users SET voice_minutes_today = 0, last_voice_reset = ? WHERE user_id = ?', now, userId);
            user.voice_minutes_today = 0;
        }
        
        // Обновляем общее время (суммарно за всё время)
        const newTotalMinutes = (user.total_voice_minutes || 0) + minutes;
        await db.run('UPDATE users SET total_voice_minutes = ? WHERE user_id = ?', newTotalMinutes, userId);

        // ====== ОПЫТ ЗА ВОЙС: каждые 15 минут → +10 опыта ======
        const oldVoiceBlocks = Math.floor((user.total_voice_minutes || 0) / config.LEVELS.VOICE_XP_INTERVAL_MIN);
        const newVoiceBlocks = Math.floor(newTotalMinutes / config.LEVELS.VOICE_XP_INTERVAL_MIN);
        const xpGain = (newVoiceBlocks - oldVoiceBlocks) * config.LEVELS.VOICE_XP_AMOUNT;
        if (xpGain > 0) {
            await awardXp(client, userId, xpGain);
        }

        // Обновляем ежедневное время и начисляем награду
        let minutesToday = (user.voice_minutes_today || 0) + minutes;
        
        // Начисляем награду каждые config.ACTIVITY.VOICE_THRESHOLD минут
        const rewardThreshold = config.ACTIVITY.VOICE_THRESHOLD || 10;
        const rewardAmount = config.ACTIVITY.VOICE_REWARD || 20;
        const maxDailyReward = config.ACTIVITY.VOICE_LIMIT || 200;
        
        // Считаем, сколько наград можно получить за эти минуты
        const previousRewards = Math.floor((minutesToday - minutes) / rewardThreshold);
        const currentRewards = Math.floor(minutesToday / rewardThreshold);
        const newRewards = currentRewards - previousRewards;
        
        if (newRewards > 0) {
            const totalReward = newRewards * rewardAmount;
            
            // Проверяем дневной лимит
            const currentDailyReward = Math.floor(minutesToday / rewardThreshold) * rewardAmount;
            
            if (currentDailyReward <= maxDailyReward) {
                await db.run('UPDATE users SET balance = balance + ? WHERE user_id = ?', totalReward, userId);
                console.log(`[VOICE] Начислено ${totalReward} экзпоинтов пользователю ${userId} за ${minutes} минут в голосовом канале`);
                
                // Отправляем уведомление пользователю (опционально, чтобы не спамить - каждые 10 минут)
                const userObj = await client.users.fetch(userId).catch(() => null);
                if (userObj && newRewards === 1) {
                    await userObj.send({
                        content: `🎙️ Вы получили **${totalReward} экзпоинтов** за **${minutes} минут** в голосовом канале!`
                    }).catch(() => {});
                }
            } else {
                console.log(`[VOICE] Дневной лимит награды достигнут для ${userId}`);
            }
        }
        
        // Обновляем ежедневные минуты
        await db.run('UPDATE users SET voice_minutes_today = ? WHERE user_id = ?', minutesToday, userId);
        
        console.log(`[VOICE] Обновлена статистика для ${userId}: всего ${newTotalMinutes} мин, сегодня ${minutesToday} мин`);
        
    } catch (error) {
        console.error('❌ Ошибка при начислении голосовой награды:', error);
    }
}

// Функция для принудительного сохранения времени (при выключении бота)
async function saveAllVoiceTimes() {
    const db = getDb();
    const now = Date.now();
    
    for (const [userId, timer] of voiceTimers.entries()) {
        const elapsedMs = now - timer.startTime;
        const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
        
        if (elapsedMinutes > 0) {
            const user = await db.get('SELECT total_voice_minutes FROM users WHERE user_id = ?', userId);
            const newTotalMinutes = (user?.total_voice_minutes || 0) + elapsedMinutes;
            await db.run('UPDATE users SET total_voice_minutes = ? WHERE user_id = ?', newTotalMinutes, userId);
            console.log(`[VOICE] Сохранено ${elapsedMinutes} минут для ${userId} при выходе`);
        }
    }
}

// Сохраняем время при завершении процесса
process.on('exit', () => {
    saveAllVoiceTimes();
});

process.on('SIGINT', () => {
    saveAllVoiceTimes();
    process.exit();
});