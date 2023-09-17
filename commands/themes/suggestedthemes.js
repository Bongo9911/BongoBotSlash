const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Themes, ThemeItems } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestedthemes')
        .setDescription('Lists suggested themes for a server'),
    async execute(interaction) {
        await interaction.deferReply();

        let themes = await Themes.findAll({
            where: {
                guild_id: interaction.guildId,
                enabled: true,
                suggestion: true
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
                .setFooter({ text: '/suggestedthemes', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
            await interaction.editReply({ embeds: [themesEmbed] });
        }
        else {
            await interaction.editReply({ content: "No themes found." });
        }

    },
};