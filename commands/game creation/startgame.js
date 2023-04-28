const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Themes, ThemeItems, Games, GameItems } = require('../../databaseModels.js');

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
        ),
    async execute(interaction) {
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

                const game = await Games.create({
                    guild_id: interaction.guildId,
                    channel_id: interaction.channelId,
                    theme_name: theme.name,
                    start_user: interaction.user.id,
                    status: "SWAPPING",
                    turns: 0,
                    active: true
                });

                const items = await ThemeItems.findAll({
                    where: {
                        theme_id: theme.id
                    }
                });

                for(let i = 0; i < items.length; ++i) {
                    await GameItems.create({
                        game_id: game.id,
                        label: items[i].label,
                        name: items[i].name,
                        color: items[i].color,
                        emoji: items[i].emoji,
                        points: points
                    });
                }

                //TODO: Insert into history table

                interaction.reply({ content: "Game started with theme: '" + themeName + "'" })
            }
            else {
                interaction.reply({ content: "Theme '" + themeName + "' not found or not available." })
            }
        }
        else {
            interaction.reply({ content: "Cannot start a new game when a game is already running in this channel." })
        }
    },
};