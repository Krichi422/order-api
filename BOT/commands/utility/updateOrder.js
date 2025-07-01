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

            const oldOrder = { ...orders[orderIndex] }; // Create a copy of the old order
            const updatedOrder = { ...oldOrder }; // Start with a copy to modify

            const oldState = updatedOrder.state;
            updatedOrder.state = newState; // Update the state

            // Logic for deliveredAt timestamp
            if (newState === 'Delivered') {
                // Set deliveredAt only if it's becoming 'Delivered' now
                if (oldState !== 'Delivered') {
                    updatedOrder.deliveredAt = currentTime.toISOString();
                    // Add update entry for state change to Delivered
                    updatedOrder.updates.push({
                        timestamp: currentTime.toISOString(),
                        description: `State changed to Delivered.`
                    });
                } else {
                    // If already delivered, just add a generic update if state is same but command was run
                    updatedOrder.updates.push({
                        timestamp: currentTime.toISOString(),
                        description: `State confirmed as Delivered.`
                    });
                }
            } else {
                // If state is changed from 'Delivered' to something else, remove deliveredAt
                if (updatedOrder.deliveredAt) {
                    delete updatedOrder.deliveredAt;
                    updatedOrder.updates.push({
                        timestamp: currentTime.toISOString(),
                        description: `State changed from Delivered to ${newState}.`
                    });
                } else if (oldState !== newState) {
                     // Add update entry for general state change (not involving Delivered transition)
                    updatedOrder.updates.push({
                        timestamp: currentTime.toISOString(),
                        description: `State changed from ${oldState} to ${newState}.`
                    });
                } else {
                    updatedOrder.updates.push({
                        timestamp: currentTime.toISOString(),
                        description: `Order state re-confirmed as ${newState}.`
                    });
                }
            }

            orders[orderIndex] = updatedOrder; // Update the order in the array
            await db.set('ordersList', orders); // Save updated list back to quick.db

            // --- Create the embed for the response ---
            const orderEmbed = createEmbed({
                title: `Order State Updated!`,
                description: `Order \`${updatedOrder.orderId}\` state changed from \`${oldState}\` to \`${updatedOrder.state}\`.`,
                color: '#3498DB', // A blue color for updates
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

            // Add deliveredAt field if it exists
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