const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Themes } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removetheme')
        .setDescription('Removes an existing Give & Take theme for the server')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The name of the theme')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        await interaction.deferReply();

        let themeName = interaction.options.getString('name').trim();

        let matchingTheme = await Themes.findOne({
            where: {
                guild_id: interaction.guildId,
                name: themeName
            }
        })

        if (matchingTheme) {
            const collectorFilter = m => m.author.id === interaction.user.id

            await interaction.followUp({ content: "Are you sure you'd like to remove this theme? (Yes/No)", fetchReply: true })
                .then(() => {
                    interaction.channel.awaitMessages({ filter: collectorFilter, max: 1, time: 60000, errors: ['time'] })
                        .then(async collected => {
                            const message = collected.first();
                            let option = message.content.trim().toLowerCase();
                            if (option == "yes") {
                                message.reply("Deleting theme...");
                                await matchingTheme.destroy();
                            }
                            else {
                                message.reply("Cancelling remove theme request.");
                            }
                        })
                        .catch(collected => {
                            interaction.followUp('Request Timed Out.');
                        });
                });
        }
        else {
            await interaction.followUp({ content: "Theme: " + themeName + " not found." });
        }
    },
};