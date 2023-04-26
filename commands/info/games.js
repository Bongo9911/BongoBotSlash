const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const SqliteConnectionService = require('../../sqliteConnectionService.js');

let connection = SqliteConnectionService.getInstance();


module.exports = {
	data: new SlashCommandBuilder()
		.setName('games')
		.setDescription('Lists active games for the server'),
	async execute(interaction) {

        let query = "SELECT `game_id`, `channel_id`, `theme_name` FROM `games` WHERE `guild_id` = " + interaction.guildId;

        let results = await connection.query(query);

        console.log(results);

        console.log("Building game list")

        let list = "";

        for(let i = 0; i < results.length; ++i)
        {
            list += "(" + results[i].game_id + ") <#" + results[i].channel_id + "> - " + results[i].theme_name + ((i === results.length - 1) ? "" : "\n");
            console.log(results[i].channel_id);
        }
        
        console.log(results.length);
        console.log(list);

        const gamesEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle("Active Games")
            .setDescription(list);
		const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, embeds: [gamesEmbed] });
	},
};