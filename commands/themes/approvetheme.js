const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Themes, ThemeItems } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('approvetheme')
        .setDescription('Approves a theme suggestion')
        .addStringOption(option =>
            option
                .setName('theme')
                .setDescription('The name of the theme')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        await interaction.deferReply();

        const themeName = interaction.options.getString('theme').trim();

        let theme = await Themes.findOne({
            where: {
                guild_id: interaction.guildId,
                name: themeName,
                suggestion: true
            }
        });

        if (theme) {
            theme.suggestion = false;
            await theme.save();
            await interaction.editReply({ content: "Theme '" + themeName + "' approved" });
        }
        else {
            await interaction.editReply({ content: "Theme '" + themeName + "' not found" });
        }

    },
};