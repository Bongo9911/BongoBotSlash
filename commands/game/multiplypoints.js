const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Themes, ThemeItems, GameItems, Games } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('multiplypoints')
        .setDescription('Multiplies all points in the game by the number provided')
        .addNumberOption(option =>
            option
                .setName('multiplier')
                .setDescription('The multiplier')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        await interaction.deferReply();

        let multiplier = interaction.options.getNumber('multiplier');

        const activeGame = await Games.findOne({
            where: {
                guild_id: interaction.guildId,
                channel_id: interaction.channelId,
                active: true
            }
        });

        if (activeGame) {
            const items = await GameItems.findAll({
                where: {
                    game_id: activeGame.id
                }
            });

            items.forEach(async (item) => {
                item.points = Math.round(item.points * multiplier);
                await item.save();
            });
            interaction.editReply({ content: "Successfully multiplied points" });
        }
        else {
            interaction.editReply({ content: "Can't multiply points because there is no active game" });
        }
    },
};