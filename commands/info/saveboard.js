const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ItemInteractions, sequelize } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saveboard')
        .setDescription('Lists the players with the highest number of saves'),
    async execute(interaction) {

        const totals = await ItemInteractions.findAll({
            attributes: [
                'user_id', [sequelize.fn('COUNT', 'id'), 'count']
            ],
            where: {
                guild_id: interaction.guildId,
                type: "Save"
            },
            group: 'user_id',
            order: [['count', 'DESC']],
            limit: 10
        });

        let list = "";
        for (let i = 0; i < totals.length; ++i) {
            list += "`" + getRankString(i + 1) + ".` <@" + totals[i].user_id + "> `" +
                totals[i].dataValues.count + " save" + (totals[i].dataValues.count != 1 ? "s`\n" : "`\n");
        }

        if (list.length) {
            const savesEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle("Top 10 Savers")
                .setDescription(list)
                .setTimestamp()
                .setFooter({ text: '/saveboard', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
            await interaction.reply({ embeds: [savesEmbed] });
        }
        else {
            await interaction.reply({ content: "No saves have been performed yet in this server" });
        }
    },
};


function getRankString(n) {
    if (n == 1) {
        return "1st";
    }
    else if (n == 2) {
        return "2nd";
    }
    else if (n == 3) {
        return "3rd";
    }
    else {
        return n + "th";
    }
}