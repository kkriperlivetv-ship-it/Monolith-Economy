const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

// Путь к папке с GIF
const GIFS_FOLDER = path.join(__dirname, '../assets/duels');

// Функция для получения случайного пути к GIF
function getRandomGifPath(category) {
    try {
        if (!fs.existsSync(GIFS_FOLDER)) {
            fs.mkdirSync(GIFS_FOLDER, { recursive: true });
        }

        const categoryPath = path.join(GIFS_FOLDER, category);
        let targetPath = categoryPath;
        
        if (!fs.existsSync(categoryPath)) {
            targetPath = GIFS_FOLDER;
        }
        
        // Получаем список gif/картинок из папки категории
        let gifFiles = [];
        if (fs.existsSync(targetPath)) {
            const entries = fs.readdirSync(targetPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile() && (entry.name.toLowerCase().endsWith('.gif') || entry.name.toLowerCase().endsWith('.png') || entry.name.toLowerCase().endsWith('.jpg') || entry.name.toLowerCase().endsWith('.webp'))) {
                    gifFiles.push(path.join(targetPath, entry.name));
                }
            }
        }
        
        // Если в категории пусто, ищем в любых подпапках assets/duels
        if (gifFiles.length === 0 && fs.existsSync(GIFS_FOLDER)) {
            const subdirs = fs.readdirSync(GIFS_FOLDER, { withFileTypes: true });
            for (const sub of subdirs) {
                if (sub.isDirectory()) {
                    const subPath = path.join(GIFS_FOLDER, sub.name);
                    const subEntries = fs.readdirSync(subPath, { withFileTypes: true });
                    for (const entry of subEntries) {
                        if (entry.isFile() && (entry.name.toLowerCase().endsWith('.gif') || entry.name.toLowerCase().endsWith('.png') || entry.name.toLowerCase().endsWith('.jpg') || entry.name.toLowerCase().endsWith('.webp'))) {
                            gifFiles.push(path.join(subPath, entry.name));
                        }
                    }
                }
            }
        }
        
        if (gifFiles.length === 0) {
            console.log(`⚠️ Нет GIF/изображений в папке: ${GIFS_FOLDER}`);
            return null;
        }
        
        const randomGif = gifFiles[Math.floor(Math.random() * gifFiles.length)];
        console.log(`✅ Выбрана GIF для "${category}": ${path.basename(randomGif)}`);
        return randomGif;
    } catch (error) {
        console.error('Ошибка при выборе GIF:', error);
        return null;
    }
}

// Функция для получения Attachment и URL для embed
function getGifForEmbed(category, customFilename = null) {
    const gifPath = getRandomGifPath(category);
    if (gifPath && fs.existsSync(gifPath)) {
        const gifBuffer = fs.readFileSync(gifPath);
        const ext = path.extname(gifPath) || '.gif';
        const fileName = customFilename || `duel_${category || 'media'}_${Date.now()}${ext}`;
        const attachment = new AttachmentBuilder(gifBuffer, { name: fileName });
        const url = `attachment://${fileName}`;
        return { attachment, url, fileName, path: gifPath };
    }
    return null;
}

module.exports = { getRandomGifPath, getGifForEmbed };
