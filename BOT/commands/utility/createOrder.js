

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
                .addChoices(
                    { name: 'Waiting', value: 'Waiting' },
                    { name: 'Finalizing', value: 'Finalizing' },
                    { name: 'Being worked on', value: 'Being worked on' },
                    { name: 'Waiting for full payment', value: 'Waiting for full payment' },
                    { name: 'Delivered', value: 'Delivered' },
                )),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const orderName = interaction.options.getString('order_name');
        const state = interaction.options.getString('state');
        const orderAuthor = interaction.user.tag;
        const currentTime = new Date();

        const db = interaction.client.db;

        try {
            let orders = await db.get('ordersList');
            if (!orders) orders = [];

            const orderId = `ORDER-${currentTime.getTime()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            const newOrder = {
                orderId,
                orderAuthor,
                orderName,
                state,
                createdAt: currentTime.toISOString(),
                updates: []
            };

            newOrder.updates.push({
                timestamp: currentTime.toISOString(),
                description: `Your order has been placed.`, // More personal and common phrasing
            });

            if (state === 'Delivered') {
                newOrder.deliveredAt = currentTime.toISOString();
                newOrder.updates.push({
                    timestamp: currentTime.toISOString(),
                    description: `Your order has been delivered!`, // Direct, personal, and adds a positive tone
                });
            }

            orders.push(newOrder);
            await db.set('ordersList', orders);

            const orderEmbed = createEmbed({
                title: `New Order Created!`,
                description: `Order \`${newOrder.orderName}\` has been successfully created.`,
                color: '#4CAF50',
                fields: [
                    { name: 'Order ID', value: `\`${newOrder.orderId}\``, inline: false },
                    { name: 'Order Name', value: newOrder.orderName, inline: true },
                    { name: 'Order Author', value: newOrder.orderAuthor, inline: true },
                    { name: 'Current State', value: newOrder.state, inline: true },
                    { name: 'Created At', value: new Date(newOrder.createdAt).toLocaleString(), inline: false }
                ],
                footerText: 'Order management system',
                timestamp: true
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