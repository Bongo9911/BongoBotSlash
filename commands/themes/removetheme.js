const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Themes, ThemeItems } = require('../../databaseModels.js');

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
                                console.log("Deleting theme")
                                console.log(matchingTheme);
                                message.reply("Deleting theme...");
                                await ThemeItems.destroy({
                                    where: {
                                        theme_id: matchingTheme.id
                                    },
                                    force: true
                                });
                                await Themes.destroy({
                                    where: {
                                        id: matchingTheme.id
                                    },
                                    force: true
                                })
                            }
                            else {
                                message.reply("Cancelling remove theme request.");
                            }
                        })
                        .catch(collected => {
                            console.error(collected);
                            interaction.editReply('Request Timed Out.');
                        });
                });
        }
        else {
            await interaction.editReply({ content: "Theme: " + themeName + " not found." });
        }
    },
};