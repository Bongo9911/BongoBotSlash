const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Lists all commands for the bot'),
    async execute(interaction) {

        const helpEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle("Commands")
            .addFields(
                {
                    name: 'Game Info', value: "`/points` - Lists the points for each item\n`/kills` - Lists the killer of each item for the current round\n" +
                        "`/saves` - Lists all of the saves performed in the current round\n`/assists` - Lists the assister for the kill of each of item for the current round\n" +
                        "`/graph` - Graphs all the point changes made from the start of the round\n", inline: true
                },
                {
                    name: 'Player Info', value: "`/stats` - Lists your player stats\n`/stats <ping>` - Lists the stats for the user pinged\n" +
                        "`/badges` - Lists all the obtainable badges\n`/setbadge <badge name>` - Set your featured badge to a badge you own\n" +
                        "`/killboard` - Lists the players with the most kills\n`/saveboard` - Lists the players with the most saves\n" +
                        "`/assistboard` - Lists the players with the most assists", inline: true
                },
            )
            .setTimestamp()
            .setFooter({ text: '/help', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
        await interaction.reply({ embeds: [helpEmbed] });
    },
};