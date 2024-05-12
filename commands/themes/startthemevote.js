const { SlashCommandBuilder, PermissionFlagsBits, Interaction } = require('discord.js');
const { ThemeVotes, Games } = require('../../databaseModels.js');
const { StartThemeVote } = require('../../giveandtake/giveandtakefunctions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startthemevote')
        .setDescription('Starts a new theme vote')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    /**
     * 
     * @param {Interaction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let themeVote = await ThemeVotes.findOne({
            where: {
                guild_id: interaction.guildId,
                channel_id: interaction.channelId,
                active: true
            }
        });

        if (themeVote) {
            await interaction.editReply({ content: "Cannot start a new theme vote when there is already an active theme vote in this channel" });
        }
        else {
            const activeGame = await Games.findOne({
                where: {
                    guild_id: interaction.guildId,
                    channel_id: interaction.channelId,
                    active: true
                }
            });

            if (activeGame) {
                await interaction.editReply({ content: "Cannot start a new theme vote while a game is running in this channel" });
            }
            else {
                await interaction.editReply({ content: "Starting theme vote..." });
                await StartThemeVote(interaction.channel);
            }
        }

    },
};