const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Themes, ThemeItems } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('themes')
        .setDescription('Lists available themes for a server'),
    async execute(interaction) {
        let themes = await Themes.findAll({
            where: {
                guild_id: interaction.guildId,
                enabled: true,
                suggestion: false
            }
        });

        if (themes.length) {
            themeList = "";

            for (let i = 0; i < themes.length; ++i) {
                const itemCount = await ThemeItems.count({
                    where: {
                        theme_id: themes[i].id
                    }
                });
                themeList += "**" + themes[i].name + "** - " + itemCount + " Items" + (i == themes.length - 1 ? " " : "\n");
            }

            const themesEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle("Themes")
                .setDescription(themeList)
                .setTimestamp()
                .setFooter({ text: '/themes', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
            await interaction.reply({ embeds: [themesEmbed] });
        }
        else {
            await interaction.reply({ content: "No themes found." });
        }

    },
};