const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const config = require('../config');

module.exports = async (client) => {
    const commands = [];
    
    // Загружаем команды из economy/economy/
    const economyCommandsPath = path.join(__dirname, 'economy', 'economy');
    if (fs.existsSync(economyCommandsPath)) {
        const commandFiles = fs.readdirSync(economyCommandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const command = require(`./economy/economy/${file}`);
                if (command.data) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                    console.log(`✅ Загружена команда: ${command.data.name}`);
                }
            } catch (err) {
                console.error(`❌ Ошибка загрузки ${file}:`, err.message);
            }
        }
    }
    
    // Загружаем команды из economy/casino/
    const casinoCommandsPath = path.join(__dirname, 'economy', 'casino');
    if (fs.existsSync(casinoCommandsPath)) {
        const commandFiles = fs.readdirSync(casinoCommandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const command = require(`./economy/casino/${file}`);
                if (command.data) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                    console.log(`✅ Загружена команда: ${command.data.name}`);
                }
            } catch (err) {
                console.error(`❌ Ошибка загрузки ${file}:`, err.message);
            }
        }
    }
    
    // Загружаем команды из economy/duel/
    const duelCommandsPath = path.join(__dirname, 'economy', 'duel');
    if (fs.existsSync(duelCommandsPath)) {
        const commandFiles = fs.readdirSync(duelCommandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const command = require(`./economy/duel/${file}`);
                if (command.data) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                    console.log(`✅ Загружена команда: ${command.data.name}`);
                }
            } catch (err) {
                console.error(`❌ Ошибка загрузки ${file}:`, err.message);
            }
        }
    }
    
    // Загружаем команды из economy/shop/
    const shopCommandsPath = path.join(__dirname, 'economy', 'shop');
    if (fs.existsSync(shopCommandsPath)) {
        const commandFiles = fs.readdirSync(shopCommandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const command = require(`./economy/shop/${file}`);
                if (command.data) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                    console.log(`✅ Загружена команда: ${command.data.name}`);
                }
            } catch (err) {
                console.error(`❌ Ошибка загрузки ${file}:`, err.message);
            }
        }
    }
    
    // Загружаем команды из economy/events/
    const eventsCommandsPath = path.join(__dirname, 'economy', 'events');
    if (fs.existsSync(eventsCommandsPath)) {
        const commandFiles = fs.readdirSync(eventsCommandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const command = require(`./economy/events/${file}`);
                if (command.data) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                    console.log(`✅ Загружена команда: ${command.data.name}`);
                }
            } catch (err) {
                console.error(`❌ Ошибка загрузки ${file}:`, err.message);
            }
        }
    }
    
    // Загружаем админ команды из admin/
    const adminCommandsPath = path.join(__dirname, 'admin');
    if (fs.existsSync(adminCommandsPath)) {
        const commandFiles = fs.readdirSync(adminCommandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const command = require(`./admin/${file}`);
                if (command.data) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                    console.log(`✅ Загружена админ-команда: ${command.data.name}`);
                }
            } catch (err) {
                console.error(`❌ Ошибка загрузки ${file}:`, err.message);
            }
        }
    }
    
    // Регистрация команд в Discord
    if (!config.TOKEN || !config.CLIENT_ID || !config.GUILD_ID) {
        const missing = [];
        if (!config.TOKEN) missing.push('TOKEN');
        if (!config.CLIENT_ID) missing.push('CLIENT_ID');
        if (!config.GUILD_ID) missing.push('GUILD_ID');
        console.log(`ℹ️ [AI Studio] Не заданы параметры Discord: ${missing.join(', ')}. Пропуск удаленной регистрации ${commands.length} слэш-команд.`);
        return;
    }

    const rest = new REST({ version: '10' }).setToken(config.TOKEN);
    
    try {
        console.log(`🔄 Регистрирую ${commands.length} команд для сервера ${config.GUILD_ID}...`);
        
        await rest.put(
            Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
            { body: commands }
        );
        
        console.log(`✅ Успешно зарегистрировано ${commands.length} команд в Discord!`);
    } catch (error) {
        console.error('❌ Ошибка регистрации команд в Discord:', error.message);
    }
};