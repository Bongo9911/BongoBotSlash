const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Games, ItemInteractions, GameItems } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saves')
        .setDescription('Lists saves from the active game'),
    async execute(interaction) {
        const activeGame = await Games.findOne({
            where: {
                guild_id: interaction.guildId,
                channel_id: interaction.channelId,
                active: true
            }
        });

        if (activeGame) {
            const savedItems = await ItemInteractions.findAll({
                where: {
                    game_id: activeGame.id,
                    type: "Save"
                }
            });

            if (savedItems.length > 0) {
                let list = "";

                for (let i = 0; i < savedItems.length; ++i) {
                    const savedItem = await GameItems.findOne({
                        where: {
                            id: savedItems[i].item_id
                        }
                    })

                    list += "**" + savedItem.name + "** - Saved By: <@" +  savedItems[i].user_id + ">" + ((i === savedItems.length - 1) ? "" : "\n");
                }

                const savesEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle("Saves")
                    .setDescription(list)
                    .setTimestamp()
                    .setFooter({ text: '/saves', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
                await interaction.reply({ embeds: [savesEmbed] });
            }
            else {
                interaction.reply({ content: "There have been no saves in the active game" });
            }
        }
        else {
            interaction.reply({ content: "There is currently no active game in this channel." });
        }
    },
};