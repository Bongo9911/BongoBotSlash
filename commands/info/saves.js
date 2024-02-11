const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Games, ItemInteractions, GameItems } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saves')
        .setDescription('Lists saves from the active game')
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
                    channel_id: interaction.channelId,
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
            const savedItems = await ItemInteractions.findAll({
                where: {
                    game_id: selectedGame.id,
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

                    list += "**" + savedItem.name + "** - Saved By: <@" + savedItems[i].user_id + ">" + ((i === savedItems.length - 1) ? "" : "\n");
                }

                const savesEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle("Saves")
                    .setDescription(list)
                    .setTimestamp()
                    .setFooter({ text: '/saves', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
                await interaction.editReply({ embeds: [savesEmbed] });
            }
            else if (gameID) {
                interaction.editReply({ content: "There were no saves in this game" });
            }
            else {
                interaction.editReply({ content: "There have been no saves in the active game" });
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