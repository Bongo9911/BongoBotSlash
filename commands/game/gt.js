const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Games, ItemInteractions, GameHistory, sequelize } = require('../../databaseModels.js');
const { getItem, addSave, addKill, addPoints, makeMove } = require('../../giveandtake/giveandtakefunctions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gt')
        .setDescription('Make a point swap in the active Give & Take game')
        .addStringOption(option =>
            option
                .setName('give')
                .setDescription('The item to give point(s) to')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('take')
                .setDescription('The item to take point(s) from')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const giveName = interaction.options.getString('give');
        const takeName = interaction.options.getString('take');

        let reply = await makeMove(interaction.guildId, interaction.channelId, interaction.user.id, giveName, takeName);

        if ("message" in reply) {
            interaction.editReply({ content: reply.message });
        }
        else if("embed" in reply) {
            let content = "+" + giveName + "\n-" + takeName;
            interaction.editReply({ content: content, embeds: [reply.embed] });
        }
        //TODO: embed
    },
};