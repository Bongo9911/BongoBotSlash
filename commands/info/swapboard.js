const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ItemInteractions, sequelize, GameHistory, Games } = require('../../databaseModels.js');
const { Op } = require('sequelize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('swapboard')
        .setDescription('Lists the players with the highest number of point swaps'),
    async execute(interaction) {
        await interaction.deferReply();

        const totals = await GameHistory.findAll({
            attributes: [
                'user_id', [sequelize.literal('COUNT(*) / 2'), 'count']
            ],
            where: {
                user_id: {
                    [Op.ne]: null
                }
            },
            include: {
                model: Games,
                where: {
                    guild_id: interaction.guildId
                }
            },
            group: 'user_id',
            order: [['count', 'DESC']],
            limit: 10
        });

        let list = "";
        for (let i = 0; i < totals.length; ++i) {
            list += "`" + getRankString(i + 1) + ".` <@" + totals[i].user_id + "> `" +
                totals[i].dataValues.count + " point swap" + (totals[i].dataValues.count != 1 ? "s`\n" : "`\n");
        }

        if (list.length) {
            const savesEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle("Top 10 Point Swappers")
                .setDescription(list)
                .setTimestamp()
                .setFooter({ text: '/swapboard', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
            await interaction.editReply({ embeds: [savesEmbed] });
        }
        else {
            await interaction.editReply({ content: "No point swaps have been performed yet in this server" });
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