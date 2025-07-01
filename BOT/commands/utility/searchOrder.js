const { SlashCommandBuilder, ApplicationCommandOptionType } = require('discord.js');
const { createEmbed } = require('../../utils/Embed'); // Import the utility function

module.exports = {
    data: new SlashCommandBuilder()
        .setName('searchorder')
        .setDescription('Searches for an order by its ID and displays its details.')
        .addStringOption(option =>
            option.setName('order_id')
                .setDescription('The ID of the order to search for (e.g., ORDER-1234567890-ABCDEF)')
                .setRequired(true)),
    async execute(interaction) {
        // Make the reply ephemeral (private)
        await interaction.deferReply({ ephemeral: true });

        const orderId = interaction.options.getString('order_id');
        const db = interaction.client.db; // Access the quick.db instance

        try {
            const allOrders = await db.get('ordersList');

            if (!allOrders || allOrders.length === 0) {
                return interaction.editReply({ content: 'No orders found in the database to search through.', ephemeral: true });
            }

            const foundOrder = allOrders.find(order => order.orderId === orderId);

            if (!foundOrder) {
                return interaction.editReply({ content: `Order with ID \`${orderId}\` not found.`, ephemeral: true });
            }

            // --- Create the embed for the found order ---
            const orderEmbed = createEmbed({
                title: `Order Details: ${foundOrder.orderName}`,
                description: `Details for order ID \`${foundOrder.orderId}\`.`,
                color: '#8E44AD', // A purple color for search results
                fields: [
                    { name: 'Order ID', value: `\`${foundOrder.orderId}\``, inline: false },
                    { name: 'Order Name', value: foundOrder.orderName, inline: true },
                    { name: 'Order Author', value: foundOrder.orderAuthor, inline: true },
                    { name: 'Current State', value: foundOrder.state, inline: true },
                    { name: 'Created At', value: new Date(foundOrder.createdAt).toLocaleString(), inline: false }
                ],
                footerText: 'Order management system',
                timestamp: true
            });

            // Add deliveredAt field if it exists
            if (foundOrder.deliveredAt) {
                orderEmbed.addFields({ name: 'Delivered At', value: new Date(foundOrder.deliveredAt).toLocaleString(), inline: false });
            }

            // Add updates field if updates exist
            if (foundOrder.updates && foundOrder.updates.length > 0) {
                // Sort updates by timestamp (oldest first)
                foundOrder.updates.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                const updatesText = foundOrder.updates.map(update =>
                    `- \`${new Date(update.timestamp).toLocaleString()}\`: ${update.description}`
                ).join('\n');

                orderEmbed.addFields({ name: 'Order History', value: updatesText, inline: false });
            }


            await interaction.editReply({
                embeds: [orderEmbed],
                ephemeral: true // Ensure the reply is ephemeral
            });

        } catch (error) {
            console.error('Error searching for order in quick.db:', error.message);
            await interaction.editReply({ content: `An error occurred while searching for the order. Error: ${error.message}`, ephemeral: true });
        }
    },
};