const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GameItems, Games } = require('../../databaseModels.js');
const { Op } = require('sequelize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('points')
        .setDescription('Lists the points for all items with more than 0 points in the active Give & Take game'),
    async execute(interaction) {
        await interaction.deferReply();

        const game = await Games.findOne({
            where: {
                guild_id: interaction.guildId,
                channel_id: interaction.channelId,
                active: true
            }
        });

        if (game) {
            const items = await GameItems.findAll({
                where: {
                    game_id: game.id,
                    points: {
                        [Op.gt]: 0
                    }
                }
            });

            let columns = Math.min(Math.ceil(items.length / 20), 3);
            let perColumn = Math.ceil(items.length / columns);

            const pointsEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setFooter({ text: "/points", iconURL: 'https://i.imgur.com/kk9lhk3.png' });

            let fields = [];

            for (let i = 0; i < columns; ++i) {
                let pointCol = "";
                for (let j = i * perColumn; j < (i + 1) * perColumn && j < items.length; ++j) {
                    if (items[j].points > 0) {
                        pointCol += "(" + items[j].label + ") " + (items[j].emoji ? items[j].emoji + " " : "") + items[j].name + " - **" + items[j].points + "**\n";
                    }
                    else {
                        pointCol += "**(" + items[j].label + ") " + (items[j].emoji ? items[j].emoji + " " : "") + items[j].name + " - " + items[j].points + "** :skull:\n";
                    }
                }
                if (i == 0) {
                    fields.push({ name: "Points", value: pointCol, inline: true });
                }
                else {
                    fields.push({ name: "\u200b", value: pointCol, inline: true });
                }
            }

            pointsEmbed.addFields(fields);

            interaction.editReply({ embeds: [pointsEmbed] });
        }
        else {
            interaction.editReply({ content: "There is currently no active game in this channel." });
        }
    },
};