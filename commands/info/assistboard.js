const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ItemInteractions, sequelize } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assistboard')
        .setDescription('Lists the players with the highest number of assists'),
    async execute(interaction) {
        await interaction.deferReply();

        const totals = await ItemInteractions.findAll({
            attributes: [
                'user_id', [sequelize.fn('COUNT', 'id'), 'count']
            ],
            where: {
                guild_id: interaction.guildId,
                type: "Assist"
            },
            group: 'user_id',
            order: [['count', 'DESC']],
            limit: 10
        });

        let list = "";
        for (let i = 0; i < totals.length; ++i) {
            list += "`" + getRankString(i + 1) + ".` <@" + totals[i].user_id + "> `" +
                totals[i].dataValues.count + " assist" + (totals[i].dataValues.count != 1 ? "s`\n" : "`\n");
        }

        if (list.length) {
            const assistsEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle("Top 10 Assisters")
                .setDescription(list)
                .setTimestamp()
                .setFooter({ text: '/assistboard', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
            await interaction.editReply({ embeds: [assistsEmbed] });
        }
        else {
            await interaction.editReply({ content: "No assists have been performed yet in this server" });
        }
    },
};


function getRankString(i) {
    let j = i % 10,
        k = i % 100;
    if (j === 1 && k !== 11) {
        return i + "st";
    }
    if (j === 2 && k !== 12) {
        return i + "nd";
    }
    if (j === 3 && k !== 13) {
        return i + "rd";
    }
    return i + "th";
}