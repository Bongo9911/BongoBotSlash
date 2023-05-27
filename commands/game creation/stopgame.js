const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Themes, ThemeItems, Games, GameItems } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stopgame')
        .setDescription('Stops the current game'),
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
            const collectorFilter = m => m.author.id === interaction.user.id

            await interaction.followUp({ content: "Are you sure you'd like to stop the current game? (Yes/No)", fetchReply: true })
        .then(() => {
            interaction.channel.awaitMessages({ filter: collectorFilter, max: 1, time: 60000, errors: ['time'] })
                .then(async collected => {
                    const message = collected.first();
                    let option = message.content.trim().toLowerCase();
                    if (option == "yes") {
                        message.reply("Stopping game...");
                        activeGame.active = false;
                        await activeGame.save();
                    }
                    else {
                        message.reply("Cancelling stop game request.");
                    }
                })
                .catch(collected => {
                    interaction.followUp('Request Timed Out.');
                });
        });
        }
        else {
            interaction.followUp({ content: "Cannot stop the game because there is no game running in this channel." })
        }
    },
};