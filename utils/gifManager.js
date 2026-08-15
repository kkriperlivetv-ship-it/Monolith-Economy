const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

// Путь к папке с GIF
const GIFS_FOLDER = path.join(__dirname, '../assets/duels');

// Функция для получения случайного пути к GIF
function getRandomGifPath(category) {
    try {
        const categoryPath = path.join(GIFS_FOLDER, category);
        
        if (!fs.existsSync(categoryPath)) {
            console.log(`⚠️ Папка не найдена: ${categoryPath}`);
            return null;
        }
        
        const gifFiles = fs.readdirSync(categoryPath).filter(file => 
            file.endsWith('.gif') || file.endsWith('.GIF')
        );
        
        if (gifFiles.length === 0) {
            console.log(`⚠️ Нет GIF в папке: ${categoryPath}`);
            return null;
        }
        
        const randomGif = gifFiles[Math.floor(Math.random() * gifFiles.length)];
        const gifPath = path.join(categoryPath, randomGif);
        console.log(`✅ Выбрана GIF для ${category}: ${randomGif}`);
        return gifPath;
    } catch (error) {
        console.error('Ошибка при выборе GIF:', error);
        return null;
    }
}

// Функция для получения Attachment и URL для embed
function getGifForEmbed(category) {
    const gifPath = getRandomGifPath(category);
    if (gifPath && fs.existsSync(gifPath)) {
        const gifBuffer = fs.readFileSync(gifPath);
        const attachment = new AttachmentBuilder(gifBuffer, { name: 'duel.gif' });
        const url = 'attachment://duel.gif';
        return { attachment, url };
    }
    return null;
}

module.exports = { getRandomGifPath, getGifForEmbed };