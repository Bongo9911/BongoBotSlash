const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ThemeVotes } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cancelthemevote')
        .setDescription('Cancel the current theme vote')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
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
            themeVote.active = false;
            await themeVote.save();
            await interaction.editReply({ content: "Cancelled the theme vote" });
        }
        else {
            await interaction.editReply({ content: "There are no active theme votes in this channel" });
        }

    },
};