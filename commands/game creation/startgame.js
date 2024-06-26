const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Themes, ThemeItems, Games, GameItems, GameHistory } = require('../../databaseModels.js');
const { StartGame } = require('../../giveandtake/giveandtakefunctions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startgame')
        .setDescription('Starts a game using the specified theme')
        .addStringOption(option =>
            option
                .setName('theme')
                .setDescription('The name of the theme')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('points')
                .setDescription('The number of points each item will start with')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        await interaction.deferReply();

        const activeGame = await Games.findOne({
            where: {
                guild_id: interaction.guildId,
                channel_id: interaction.channelId,
                active: true
            }
        });

        if (!activeGame) {
            const themeName = interaction.options.getString('theme').trim();
            const theme = await Themes.findOne({
                where: {
                    guild_id: interaction.guildId,
                    name: themeName,
                    enabled: true
                }
            });

            if (theme) {
                const points = interaction.options.getInteger('points');

                await StartGame(theme, points, interaction.guildId, interaction.channelId, interaction.user.id);

                interaction.editReply({ content: "Game started with theme: '" + themeName + "'" })
            }
            else {
                interaction.editReply({ content: "Theme '" + themeName + "' not found or not available." })
            }
        }
        else {
            interaction.editReply({ content: "Cannot start a new game when a game is already running in this channel." })
        }
    },
};