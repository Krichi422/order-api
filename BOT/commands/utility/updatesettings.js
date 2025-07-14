const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    // Keep this command restricted to developers only for security.
    devOnly: true,
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('View and modify custom bot settings from the "custom-settings" table.')
        // Subcommand to view all custom settings
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Shows all custom settings and their current values.')
        )
        // Subcommand to change a specific custom setting
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Sets a new value for a specific custom setting.')
                .addStringOption(option =>
                    option.setName('setting_name')
                        .setDescription('The name of the setting you want to change.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('The new value for the setting. Can be a number, boolean, or JSON.')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const db = interaction.client.db; // Assumes your quick.db instance is on the client

        try {
            if (subcommand === 'view') {
                // Get the entire "custom-settings" object
                const settings = await db.get('custom-settings');

                if (!settings || Object.keys(settings).length === 0) {
                    return interaction.editReply({ content: 'No custom settings have been configured yet.' });
                }

                const embed = new EmbedBuilder()
                    .setTitle('Custom settings')
                    .setDescription('Here are the currently configured settings.')
                    .setColor('#0099ff');

                // Iterate through each key-value pair in the settings object
                for (const [key, value] of Object.entries(settings)) {
                    let valueString;
                    // Format the value for display based on its type
                    if (typeof value === 'object') {
                        valueString = `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
                    } else {
                        valueString = `\`${value}\``;
                    }
                    embed.addFields({ name: `**${key}**`, value: valueString, inline: false });
                }

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'set') {
                const settingName = interaction.options.getString('setting_name');
                const valueString = interaction.options.getString('value');
                let parsedValue;

                try {
                    parsedValue = JSON.parse(valueString);
                } catch (e) {
                    if (!isNaN(valueString) && !isNaN(parseFloat(valueString))) {
                        parsedValue = parseFloat(valueString);
                    } else if (valueString.toLowerCase() === 'true' || valueString.toLowerCase() === 'false') {
                        parsedValue = valueString.toLowerCase() === 'true';
                    } else {
                        parsedValue = valueString;
                    }
                }

                await db.set(`custom-settings.${settingName}`, parsedValue);

                const updatedSetting = await db.get(`custom-settings.${settingName}`);
                
                const embed = new EmbedBuilder()
                    .setTitle('Setting Updated')
                    .setDescription(`Successfully updated the setting \`${settingName}\`.`)
                    .setColor('#4CAF50')
                    .addFields(
                        { name: 'Setting Name', value: `\`${settingName}\``, inline: true },
                        { name: 'New Value', value: `\`\`\`json\n${JSON.stringify(updatedSetting, null, 2)}\n\`\`\``, inline: false }
                    );

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error in settings command:', error);
            await interaction.editReply({ content: `An error occurred: \`${error.message}\`` });
        }
    },
};