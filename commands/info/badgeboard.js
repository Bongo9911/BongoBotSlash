const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sequelize, UserBadges, Badges } = require('../../databaseModels.js');
const { HasMany } = require('sequelize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('badgeboard')
        .setDescription('Lists the players with the highest number of badges'),
    async execute(interaction) {
        await interaction.deferReply();

        const totals = await UserBadges.findAll({
            attributes: [
                'user_id', [sequelize.fn('COUNT', 'id'), 'count']
            ],
            where: {
                guild_id: interaction.guildId
            },
            group: 'user_id',
            order: [['count', 'DESC']],
            limit: 10
        });

        let list = "";
        for (let i = 0; i < totals.length; ++i) {
            const badges = await UserBadges.findAll({
                where: {
                    user_id: totals[i].user_id,
                    guild_id: interaction.guildId
                },
                include: Badges
            });

            list += "`" + getRankString(i + 1) + ".` <@" + totals[i].user_id + "> `" +
                totals[i].dataValues.count + " badge" + (totals[i].dataValues.count != 1 ? "s`" : "`") + 
                badges.map(b => b.badge.emoji).join('') + "\n";
        }

        if (list.length) {
            const badgesEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle("Top 10 Badge Earners")
                .setDescription(list)
                .setTimestamp()
                .setFooter({ text: '/badgeboard', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
            await interaction.editReply({ embeds: [badgesEmbed] });
        }
        else {
            await interaction.editReply({ content: "No badges have been earned yet in this server" });
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