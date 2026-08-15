require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');

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
    if (!process.env.TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
        console.log(`ℹ️ [AI Studio] Discord учетные данные (TOKEN/CLIENT_ID/GUILD_ID) не заданы. Пропуск удаленной регистрации ${commands.length} слэш-команд.`);
        return;
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    
    try {
        console.log(`🔄 Регистрирую ${commands.length} команд...`);
        
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        
        console.log(`✅ Успешно зарегистрировано ${commands.length} команд!`);
    } catch (error) {
        console.error('❌ Ошибка регистрации команд:', error.message);
    }
};