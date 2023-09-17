const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Games, ItemInteractions, GameItems } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kills')
        .setDescription('Lists kills from the active game'),
    async execute(interaction) {
        await interaction.deferReply();

        const activeGame = await Games.findOne({
            where: {
                guild_id: interaction.guildId,
                channel_id: interaction.channelId,
                active: true
            }
        });

        if (activeGame) {
            const killedItems = await ItemInteractions.findAll({
                where: {
                    game_id: activeGame.id,
                    type: "Kill"
                }
            });

            if (killedItems.length > 0) {
                let list = "";

                for (let i = 0; i < killedItems.length; ++i) {
                    const killedItem = await GameItems.findOne({
                        where: {
                            id: killedItems[i].item_id
                        }
                    })

                    list += "**" + killedItem.name + "** - Killed By: <@" +  killedItems[i].user_id + ">" + ((i === killedItems.length - 1) ? "" : "\n");
                }

                const killsEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle("Kills")
                    .setDescription(list)
                    .setTimestamp()
                    .setFooter({ text: '/kills', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
                await interaction.editReply({ embeds: [killsEmbed] });
            }
            else {
                interaction.editReply({ content: "There have been no kills in the active game" });
            }
        }
        else {
            interaction.editReply({ content: "There is currently no active game in this channel." });
        }
    },
};