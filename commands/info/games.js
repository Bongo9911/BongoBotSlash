const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Games } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games')
        .setDescription('Lists active games for the server'),
    async execute(interaction) {
        await interaction.deferReply();

        let guildGames = await Games.findAll({
            where: {
                guild_id: interaction.guildId
            }
        });

        if (guildGames.length) {
            let list = "";

            for (let i = 0; i < guildGames.length; ++i) {
                list += "(" + guildGames[i].game_id + ") <#" + guildGames[i].channel_id + "> - " + guildGames[i].theme_name + ((i === guildGames.length - 1) ? "" : "\n");
            }

            const gamesEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle("Active Games")
                .setDescription(list)
                .setTimestamp()
                .setFooter({ text: '/games', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
            await interaction.editReply({ embeds: [gamesEmbed] });
        }
        else {
            await interaction.editReply({ content: "No active games found." });
        }

    },
};