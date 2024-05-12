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

            let colRowCount = 0;
            let colString = "";

            for (let i = 0; i < items.length; ++i) {
                let rowString = "(" + items[i].label + ") " + (items[i].emoji ? items[i].emoji + " " : "") + items[i].name + " - **" + items[i].points + "**\n";

                if (colString.length + rowString.length > 1024 || colRowCount > perColumn) {
                    if (fields.length === 0) {
                        fields.push({ name: "Points", value: colString, inline: true });
                    }
                    else {
                        fields.push({ name: "\u200b", value: colString, inline: true });
                    }
                    colRowCount = 0;
                    colString = rowString;
                }
                else {
                    colString += rowString;
                    colRowCount++;
                }
            }

            if (colString.length > 0) {
                if (fields.length === 0) {
                    fields.push({ name: "Points", value: colString, inline: true });
                }
                else {
                    fields.push({ name: "\u200b", value: colString, inline: true });
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