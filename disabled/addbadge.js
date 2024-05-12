const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Themes, ThemeItems, Badges } = require('../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addbadge')
        .setDescription('Adds a new badge (only available to Bongo)')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The name of the badge')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('description')
                .setDescription('The description of the badge')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('emoji')
                .setDescription('The emoji of the badge')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('The url of the badge')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply();

        if (interaction.user.id === "200313450319052801") {
            await Badges.create({
                name: interaction.options.getString('name'),
                description: interaction.options.getString('description'),
                emoji: interaction.options.getString('emoji'),
                image_url: interaction.options.getString('url'),
            })

            interaction.editReply({ content: "Created!" });
        }
        else {
            interaction.editReply({ content: "Badges may not be created by anyone other than Bongo" });
        }
    },
};