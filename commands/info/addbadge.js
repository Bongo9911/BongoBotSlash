const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Themes, ThemeItems, Badges } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addbadge')
        .setDescription('Lists available themes for a server')
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
        
        await Badges.create({
            name: interaction.options.getString('name'),
            description: interaction.options.getString('description'),
            emoji: interaction.options.getString('emoji'),
            image_url: interaction.options.getString('url'),
        })

        interaction.reply({content: "Created!"});
    },
};