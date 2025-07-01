

const { SlashCommandBuilder, ApplicationCommandOptionType } = require('discord.js');
const { createEmbed } = require('../../utils/Embed');


module.exports = {
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('createorder')
        .setDescription('Creates a new order with an auto-generated ID and saves it to the bot\'s database.')
        .addStringOption(option =>
            option.setName('order_name')
                .setDescription('The name or description of the order.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('state')
                .setDescription('The current state of the order.')
                .setRequired(true)
                .addChoices( // Define specific choices for the state
                    { name: 'Waiting', value: 'Waiting' },
                    { name: 'Finalizing', value: 'Finalizing' },
                    { name: 'Being worked on', value: 'Being worked on' },
                    { name: 'Waiting for full payment', value: 'Waiting for full payment' },
                    { name: 'Delivered', value: 'Delivered' },
                )),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Acknowledge privately

        const orderName = interaction.options.getString('order_name');
        const state = interaction.options.getString('state');
        const orderAuthor = interaction.user.tag; // Get the Discord tag of the user who ran the command
        const currentTime = new Date();

        // Access the quick.db instance from the client object
        const db = interaction.client.db;

        try {
            let orders = await db.get('ordersList');
            if (!orders) orders = []; // Initialize if it doesn't exist

            // Generate a simple unique order ID (e.g., timestamp + random suffix)
            const orderId = `ORDER-${currentTime.getTime()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            const newOrder = {
                orderId,
                orderAuthor,
                orderName,
                state,
                createdAt: currentTime.toISOString(), // Add creation timestamp
                updates: [] // Initialize updates array
            };

            // Add initial "Order created" update
            newOrder.updates.push({
                timestamp: currentTime.toISOString(),
                description: `Order created.`
            });

            // If the initial state is 'Delivered', set deliveredAt immediately
            if (state === 'Delivered') {
                newOrder.deliveredAt = currentTime.toISOString();
                newOrder.updates.push({
                    timestamp: currentTime.toISOString(),
                    description: `Order marked as Delivered.`
                });
            }

            orders.push(newOrder);
            await db.set('ordersList', orders); // Save updated list back to quick.db

            // --- Create the embed for the response ---
            const orderEmbed = createEmbed({
                title: `New Order Created!`,
                description: `Order \`${newOrder.orderName}\` has been successfully created.`,
                color: '#4CAF50', // A nice green color for success
                fields: [
                    { name: 'Order ID', value: `\`${newOrder.orderId}\``, inline: false },
                    { name: 'Order Name', value: newOrder.orderName, inline: true },
                    { name: 'Order Author', value: newOrder.orderAuthor, inline: true },
                    { name: 'Current State', value: newOrder.state, inline: true },
                    { name: 'Created At', value: new Date(newOrder.createdAt).toLocaleString(), inline: false }
                ],
                footerText: 'Order management system',
                timestamp: true // Automatically adds current timestamp to footer
            });

            await interaction.editReply({
                embeds: [orderEmbed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error creating order directly in quick.db:', error.message);
            await interaction.editReply({ content: `Failed to create order. Error: ${error.message}`, ephemeral: true });
        }
    },
};