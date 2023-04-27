const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Games } = require('../../databaseModels.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('games')
		.setDescription('Lists active games for the server'),
	async execute(interaction) {
        let guildGames = await Games.findAll({
            where: {
                guild_id: interaction.guildId
            }
        });

        console.log("Building game list")

        let list = "";

        for(let i = 0; i < guildGames.length; ++i)
        {
            list += "(" + guildGames[i].game_id + ") <#" + guildGames[i].channel_id + "> - " + guildGames[i].theme_name + ((i === guildGames.length - 1) ? "" : "\n");
            console.log(guildGames[i].channel_id);
        }
        
        if(list.length === 0) {
            list = "No games found";
        }

        const gamesEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle("Active Games")
            .setDescription(list);
		await interaction.reply({ embeds: [gamesEmbed] });
	},
};