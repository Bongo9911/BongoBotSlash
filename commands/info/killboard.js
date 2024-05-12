const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ItemInteractions, sequelize } = require('../../databaseModels.js');
const { Pagination } = require('pagination.djs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('killboard')
        .setDescription('Lists the players with the highest number of kills'),
    async execute(interaction) {
        await interaction.deferReply();

        const totals = await ItemInteractions.findAll({
            attributes: [
                'user_id', [sequelize.fn('COUNT', 'id'), 'count']
            ],
            where: {
                guild_id: interaction.guildId,
                type: "Kill"
            },
            group: 'user_id',
            order: [['count', 'DESC']]
        });

        let rows = [];
        for (let i = 0; i < totals.length; ++i) {
            rows.push("`" + getRankString(i + 1) + ".` <@" + totals[i].user_id + "> `" +
                totals[i].dataValues.count + " kill" + (totals[i].dataValues.count != 1 ? "s`\n" : "`\n"));
        }

        if (rows.length) {
            const pagination = new Pagination(interaction);

            const embeds = [];
            while (rows.length) {
                let pageRows = rows.splice(0, 10);
                const killsEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle("Top Killers")
                    .setDescription(pageRows.join(""))
                    .setTimestamp()
                    .setFooter({ text: '/killboard', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
                embeds.push(killsEmbed)
            }

            pagination.setEmbeds(embeds);

            await pagination.render();
        }
        else {
            await interaction.editReply({ content: "No kills have been performed yet in this server" });
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