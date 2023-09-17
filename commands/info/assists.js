const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Games, ItemInteractions, GameItems } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assists')
        .setDescription('Lists assists from the active game'),
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
            const assistedItems = await ItemInteractions.findAll({
                where: {
                    game_id: activeGame.id,
                    type: "Assist"
                }
            });

            if (assistedItems.length > 0) {
                let list = "";

                for (let i = 0; i < assistedItems.length; ++i) {
                    const assistedItem = await GameItems.findOne({
                        where: {
                            id: assistedItems[i].item_id
                        }
                    })

                    list += "**" + assistedItem.name + "** - Assisted By: <@" +  assistedItems[i].user_id + ">" + ((i === assistedItems.length - 1) ? "" : "\n");
                }

                const assitsEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle("Assists")
                    .setDescription(list)
                    .setTimestamp()
                    .setFooter({ text: '/assists', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
                await interaction.editReply({ embeds: [assitsEmbed] });
            }
            else {
                interaction.editReply({ content: "There have been no assists in the active game" });
            }
        }
        else {
            interaction.editReply({ content: "There is currently no active game in this channel." });
        }
    },
};