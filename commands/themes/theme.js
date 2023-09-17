const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Themes, ThemeItems } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('theme')
        .setDescription('Shows information about a theme')
        .addStringOption(option =>
            option
                .setName('theme')
                .setDescription('The name of the theme')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();

        const themeName = interaction.options.getString('theme').trim();

        let theme = await Themes.findOne({
            where: {
                guild_id: interaction.guildId,
                name: themeName,
                enabled: true
            }
        });

        if (theme) {
            itemList = "";
            const items = await ThemeItems.findAll({
                where: {
                    theme_id: theme.id
                }
            });
            for (let i = 0; i < items.length; ++i) {
                itemList += "(" + items[i].label + ") " + (items[i].emoji ? items[i].emoji + " " : "") + items[i].name + (i !== items.length - 1 ? "\n" : "");
            }

            const themeEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle("Theme - " + theme.name)
                .setDescription(itemList)
                .setTimestamp()
                .setFooter({ text: '/theme', iconURL: 'https://i.imgur.com/kk9lhk3.png' });
            await interaction.editReply({ embeds: [themeEmbed] });
        }
        else {
            await interaction.editReply({ content: "Theme '" + themeName + "' not found" });
        }

    },
};