const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

/**
 * Loads command files from the 'commands' directory and stores them in client.commands.
 * @param {Client} client The Discord client instance.
 */

const commands = []; // Array to hold command data for Discord API registration

async function loadCommands(client) {
    const commandsPath = path.join(__dirname, '..', 'commands'); // Go up one level to 'commands'
    const commandFolders = fs.readdirSync(commandsPath);


    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON()); // Add command data for registration
            } else {
                console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
}

/**
 * Registers application (/) commands with the Discord API.
 * @param {Client} client The Discord client instance.
 * @param {string} clientId Your bot's Application ID.
 * @param {string | undefined} guildId Optional: Guild ID for guild-specific commands.
 */
async function registerCommands(client, clientId, guildId) {
    const rest = new REST().setToken(client.token); // Use client.token directly

    try {
        if (guildId) {
            // For guild-specific commands (faster for testing)
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            console.log(`Successfully reloaded guild (/) commands for guild ID: ${guildId}`);
        } else {
            // For global commands (takes up to an hour to propagate)
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            console.log('Successfully reloaded global (/) commands.');
        }
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
}

module.exports = {
    loadCommands,
    registerCommands
};