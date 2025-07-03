const { SlashCommandBuilder, InteractionContextType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/Embed'); // Import the utility function

const ORDERS_PER_PAGE = 5; // How many orders to show per page

module.exports = {
    data: new SlashCommandBuilder()
        .setName('orders')
        .setDescription('Displays all current orders, with pagination.'),
    async execute(interaction) {
        await interaction.deferReply(); // Defer the reply as fetching orders might take a moment

        const db = interaction.client.db; // Access the quick.db instance from the client

        try {
            const allOrders = await db.get('ordersList');

            if (!allOrders || allOrders.length === 0) {
                return interaction.editReply({ content: 'There are no orders currently in the system.' });
            }

            // Sort orders by creation date (newest first)
            allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const totalPages = Math.ceil(allOrders.length / ORDERS_PER_PAGE);
            let currentPage = 0; // Start at the first page (index 0)

            // Function to generate the embed for a given page
            const generateOrderEmbed = (pageIndex) => {
                const start = pageIndex * ORDERS_PER_PAGE;
                const end = start + ORDERS_PER_PAGE;
                const ordersOnPage = allOrders.slice(start, end);

                const fields = ordersOnPage.map(order => ({
                    name: `Order ID: ${order.orderId}`,
                    value: `**Name:** ${order.orderName}\n**Author:** ${order.orderAuthor}\n**State:** ${order.state}\n**Created:** ${new Date(order.createdAt).toLocaleString()}${order.deliveredAt ? `\n**Delivered:** ${new Date(order.deliveredAt).toLocaleString()}` : ''}`,
                    inline: false,
                }));

                return createEmbed({
                    title: `Current Orders (Page ${pageIndex + 1}/${totalPages})`,
                    description: `Displaying ${ordersOnPage.length} of ${allOrders.length} orders.`,
                    color: '#0099FF', // A general info blue
                    fields: fields.length > 0 ? fields : [{ name: 'No orders on this page.', value: '...' }],
                    footerText: `Use the buttons to navigate.`,
                    timestamp: true,
                });
            };

            // Function to create navigation buttons
            const createNavigationButtons = (pageIndex) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev_page')
                            .setLabel('⬅️ Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(pageIndex === 0),
                        new ButtonBuilder()
                            .setCustomId('next_page')
                            .setLabel('Next ➡️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(pageIndex === totalPages - 1),
                    );
            };

            // Send the initial message
            const initialEmbed = generateOrderEmbed(currentPage);
            const initialButtons = createNavigationButtons(currentPage);

            const message = await interaction.editReply({
                embeds: [initialEmbed],
                components: [initialButtons],
                epheremal: false,
                fetchReply: true, // Required to collect interactions on this message
            });

            // Create a collector for button interactions
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id, // Only the user who ran the command can interact
                time: 120000, // Collector lasts for 2 minutes (120,000 ms)
            });

            collector.on('collect', async i => {
                if (i.customId === 'prev_page') {
                    currentPage--;
                } else if (i.customId === 'next_page') {
                    currentPage++;
                }

                // Ensure page index stays within bounds
                currentPage = Math.max(0, Math.min(currentPage, totalPages - 1));

                const updatedEmbed = generateOrderEmbed(currentPage);
                const updatedButtons = createNavigationButtons(currentPage);

                await i.update({
                    embeds: [updatedEmbed],
                    components: [updatedButtons],
                });
            });

            collector.on('end', async collected => {
                // Disable buttons when the collector ends (e.g., after timeout)
                const disabledButtons = createNavigationButtons(currentPage);
                disabledButtons.components.forEach(button => button.setDisabled(true));
                await interaction.editReply({
                    components: [disabledButtons],
                }).catch(console.error); // Catch potential errors if message was deleted
            });

        } catch (error) {
            console.error('Error listing orders from quick.db:', error.message);
            await interaction.editReply({ content: `Failed to list orders. Error: ${error.message}` });
        }
    },
};