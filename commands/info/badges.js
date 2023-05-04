const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Badges } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('badges')
        .setDescription('Lists all badges available to be obtained'),
    async execute(interaction) {
        let badges = await Badges.findAll();

            badgeList = "";

            for (let i = 0; i < badges.length; ++i) {
                badgeList += badges[i].emoji + " **" + badges[i].name + "** - " + badges[i].description + (i == badges.length - 1 ? " " : "\n");
            }

            const badgesEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle("Badges")
                .setDescription(badgeList)
                .setTimestamp()
                .setFooter({ text: '/badges', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
            await interaction.reply({ embeds: [badgesEmbed] });

    },
};