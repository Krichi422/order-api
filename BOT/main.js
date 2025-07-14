const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands, registerCommands } = require('./handlers/CommandHandler'); // Import handler
const { QuickDB } = require('quick.db');
require('dotenv').config();

// --- Configuration ---
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // Optional: For guild-specific commands during development

// --- Cleanup Function for Delivered Orders ---
const DELIVERY_RETENTION_DAYS = 25; // Orders will be deleted after 25 days in 'Delivered' state
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run cleanup every 24 hours (adjust as needed)

// Create a new Discord client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

client.commands = new Collection();
client.db = new QuickDB()

client.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';

async function cleanupDeliveredOrders() {
    try {
        let orders = await client.db.get('ordersList');
        if (!orders || orders.length === 0) {
            console.log('No orders found for cleanup.');
            return;
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - DELIVERY_RETENTION_DAYS); 

        const ordersToDelete = [];
        const remainingOrders = [];

        for (const order of orders) {
            if (order.state === 'Delivered') {
                // Check deliveredAt timestamp for deletion
                if (order.deliveredAt) {
                    const deliveredAtDate = new Date(order.deliveredAt);
                    if (deliveredAtDate < cutoffDate) {
                        ordersToDelete.push(order);
                    } else {
                        remainingOrders.push(order);
                    }
                } else {
                    console.warn(`Order ID ${order.orderId} is 'Delivered' but missing 'deliveredAt' timestamp.`);
                    remainingOrders.push(order);
                }
            } else {
                remainingOrders.push(order); // Keep non-delivered orders
            }
        }

        if (ordersToDelete.length > 0) {
            await client.db.set('ordersList', remainingOrders);
            console.log(`Cleaned up ${ordersToDelete.length} delivered orders older than ${DELIVERY_RETENTION_DAYS} days.`);
            ordersToDelete.forEach(order => {
                console.log(`Deleted order ID: ${order.orderId}, Name: ${order.orderName}, Delivered At: ${order.deliveredAt || order.createdAt}`);
            });
        } else {
            console.log('No delivered orders found for cleanup that meet the deletion criteria.');
        }

    } catch (error) {
        console.error('Error during delivered orders cleanup:', error);
    }
}


client.once('ready', async () => {
    console.log(`Discord Bot logged in as ${client.user.tag}!`);
    console.log(`API Base URL: ${client.apiBaseUrl}`);

    await loadCommands(client);
    console.log(`Loaded ${client.commands.size} commands.`);

    await registerCommands(client, CLIENT_ID, GUILD_ID);
    console.log('Application (/) commands registered.');

    await cleanupDeliveredOrders();
    setInterval(cleanupDeliveredOrders, CLEANUP_INTERVAL_MS);
    console.log(`Scheduled delivered order cleanup to run every ${CLEANUP_INTERVAL_MS / (1000 * 60 * 60)} hours.`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }

    try {
        if ((command.devOnly && interaction.user.id == process.env.DEV_ID) || !command.devOnly) {
           await command.execute(interaction);
        } else {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.login(DISCORD_BOT_TOKEN);