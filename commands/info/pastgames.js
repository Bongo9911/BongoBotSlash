const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ItemInteractions, sequelize, Games } = require('../../databaseModels.js');
const { Pagination } = require('pagination.djs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pastgames')
        .setDescription('Lists all past games for the server'),
    async execute(interaction) {
        await interaction.deferReply();

        const guildGames = await Games.findAll({
            where: {
                guild_id: interaction.guildId,
                active: false
            }
        });

        let rows = [];
        for (let i = 0; i < guildGames.length; ++i) {
            rows.push("(" + guildGames[i].id + ") - **" + guildGames[i].theme_name + "**\n");
        }

        if (rows.length) {
            const pagination = new Pagination(interaction);

            const embeds = [];
            while (rows.length) {
                let pageRows = rows.splice(0, 10);
                const gamesEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle("Past Games")
                    .setDescription(pageRows.join(""))
                    .setTimestamp()
                    .setFooter({ text: '/pastgames', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
                embeds.push(gamesEmbed)
            }

            pagination.setEmbeds(embeds);

            await pagination.render();
        }
        else {
            await interaction.editReply({ content: "No games have been completed in this server" });
        }
    },
};