const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Games, ItemInteractions, GameItems } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assists')
        .setDescription('Lists assists from the active game')
        .addNumberOption(option =>
            option
                .setName('gameid')
                .setDescription('The ID of the game to graph')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();
        
        let gameID = interaction.options.getNumber('gameid');

        let selectedGame;

        if (gameID) {
            selectedGame = await Games.findOne({
                where: {
                    guild_id: interaction.guildId,
                    id: gameID
                }
            });
        }
        else {
            selectedGame = await Games.findOne({
                where: {
                    guild_id: interaction.guildId,
                    channel_id: interaction.channelId,
                    active: true
                }
            });
        }

        if (selectedGame) {
            const assistedItems = await ItemInteractions.findAll({
                where: {
                    game_id: selectedGame.id,
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
                    .setTitle("Assists - " + selectedGame.theme_name)
                    .setDescription(list)
                    .setTimestamp()
                    .setFooter({ text: '/assists', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
                await interaction.editReply({ embeds: [assitsEmbed] });
            }
            else if (gameID) {
                interaction.editReply({ content: "There were no assists in this game" });
            }
            else {
                interaction.editReply({ content: "There have been no assists in the active game" });
            }
        }
        else if (gameID) {
            interaction.editReply({ content: "No game found with this ID for this guild." });
        }
        else {
            interaction.editReply({ content: "There is currently no active game in this channel." });
        }
    },
};