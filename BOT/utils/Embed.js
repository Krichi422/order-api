const { EmbedBuilder } = require('discord.js');

/**
 * Creates a Discord EmbedBuilder object with various customizable properties.
 * This is a utility function, not a Discord command.
 * It's designed to be imported and used by command files or other bot logic.
 *
 * @param {object} options - Options for the embed.
 * @param {string} [options.title] - The title of the embed.
 * @param {string} [options.description] - The description text of the embed.
 * @param {string} [options.color] - The color of the embed (hex code like #RRGGBB or a color name).
 * @param {string} [options.url] - A URL for the embed title to link to.
 * @param {string} [options.authorName] - The name of the author.
 * @param {string} [options.authorIconUrl] - URL for the author icon.
 * @param {string} [options.authorUrl] - URL for the author name to link to.
 * @param {string} [options.imageUrl] - URL for the main image of the embed.
 * @param {string} [options.thumbnailUrl] - URL for the thumbnail image of the embed.
 * @param {string} [options.footerText] - The text for the embed footer.
 * @param {string} [options.footerIconUrl] - URL for the footer icon.
 * @param {Array<object>} [options.fields] - An array of field objects: [{ name: string, value: string, inline?: boolean }].
 * @returns {EmbedBuilder} The constructed EmbedBuilder object.
 */
function createEmbed(options = {}) {
    const embed = new EmbedBuilder();

    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);

    if (options.color) {
        // Basic color validation/conversion
        if (options.color.startsWith('#') && options.color.length === 7) {
            embed.setColor(options.color);
        } else {
            // Attempt to use a named color (Discord.js supports some common ones)
            // Fallback to a default if not recognized
            try {
                embed.setColor(options.color.toUpperCase()); // Try to use Discord.js's built-in color names
            } catch (e) {
                console.warn(`Invalid color name provided: ${options.color}. Using default.`);
                embed.setColor(0x0099FF); // Default blue
            }
        }
    } else {
        embed.setColor(0x0099FF); // Default blue if no color provided
    }

    if (options.url) embed.setURL(options.url);

    if (options.authorName) {
        embed.setAuthor({
            name: options.authorName,
            iconURL: options.authorIconUrl || undefined,
            url: options.authorUrl || undefined,
        });
    }

    if (options.imageUrl) embed.setImage(options.imageUrl);
    if (options.thumbnailUrl) embed.setThumbnail(options.thumbnailUrl);

    if (options.footerText) {
        embed.setFooter({
            text: options.footerText,
            iconURL: options.footerIconUrl || undefined,
        });
    }
    embed.setTimestamp(); // Adds a timestamp to the embed

    if (options.fields && Array.isArray(options.fields)) {
        options.fields.forEach(field => {
            if (field.name && field.value) {
                embed.addFields({
                    name: field.name,
                    value: field.value,
                    inline: field.inline !== null && field.inline !== undefined ? field.inline : false
                });
            }
        });
    }

    return embed;
}

module.exports = {
    createEmbed
};