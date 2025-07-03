const { SlashCommandBuilder, ApplicationCommandOptionType } = require('discord.js');
const { createEmbed } = require('../../utils/Embed'); // Import the utility function

module.exports = {
    data: new SlashCommandBuilder()
        .setName('updateorder')
        .setDescription('Changes the state of an existing order.')
        .addStringOption(option =>
            option.setName('order_id')
                .setDescription('The ID of the order to update (e.g., ORDER-1234567890-ABCDEF)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('new_state')
                .setDescription('The new state for the order.')
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

        const orderId = interaction.options.getString('order_id');
        const newState = interaction.options.getString('new_state');
        const currentTime = new Date();
        const updater = interaction.user.tag;

        // Access the quick.db instance from the client object
        const db = interaction.client.db;

        try {
            let orders = await db.get('ordersList');
            if (!orders || orders.length === 0) {
                return interaction.editReply({ content: 'No orders found in the database.', ephemeral: true });
            }

            const orderIndex = orders.findIndex(order => order.orderId === orderId);

            if (orderIndex === -1) {
                return interaction.editReply({ content: `Order with ID \`${orderId}\` not found.`, ephemeral: true });
            }

            const oldOrder = { ...orders[orderIndex] };
            const updatedOrder = { ...oldOrder };

            const oldState = updatedOrder.state;
            updatedOrder.state = newState;

            if (newState === 'Delivered') {
                if (oldState !== 'Delivered') {
                    updatedOrder.deliveredAt = currentTime.toISOString();
                    updatedOrder.updates.push({
                        timestamp: currentTime.toISOString(),
                        description: `Your order has been delivered!`, 
                    });
                } else {
                    updatedOrder.updates.push({
                        timestamp: currentTime.toISOString(),
                        description: `Order delivery confirmed.`,
                    });
                }
            } else {
                if (updatedOrder.deliveredAt) {
                    delete updatedOrder.deliveredAt;
                    updatedOrder.updates.push({
                        timestamp: currentTime.toISOString(),
                        description: `Order status changed from Delivered to ${newState}.`,
                    });
                } else if (oldState !== newState) {
                    updatedOrder.updates.push({
                        timestamp: currentTime.toISOString(),
                        description: `Order status updated to ${newState}.`,
                    });
                } else {
                    updatedOrder.updates.push({
                        timestamp: currentTime.toISOString(),
                        description: `Order status confirmed as ${newState}.`,
                    });
                }
            }

            orders[orderIndex] = updatedOrder;
            await db.set('ordersList', orders);

            const orderEmbed = createEmbed({
                title: `Order State Updated!`,
                description: `Order \`${updatedOrder.orderId}\` state changed from \`${oldState}\` to \`${updatedOrder.state}\`.`,
                color: '#3498DB',
                fields: [
                    { name: 'Order ID', value: `\`${updatedOrder.orderId}\``, inline: false },
                    { name: 'Order Name', value: updatedOrder.orderName, inline: true },
                    { name: 'Order Author', value: updatedOrder.orderAuthor, inline: true },
                    { name: 'New State', value: updatedOrder.state, inline: true },
                    { name: 'Created At', value: new Date(updatedOrder.createdAt).toLocaleString(), inline: false }
                ],
                footerText: 'Order management system',
                timestamp: true
            });

            if (updatedOrder.deliveredAt) {
                orderEmbed.addFields({ name: 'Delivered At', value: new Date(updatedOrder.deliveredAt).toLocaleString(), inline: false });
            }

            await interaction.editReply({
                embeds: [orderEmbed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error updating order state in quick.db:', error.message);
            await interaction.editReply({ content: `Failed to update order state. Error: ${error.message}`, ephemeral: true });
        }
    },
};