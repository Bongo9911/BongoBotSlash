const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Games } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createtheme')
        .setDescription('Creates a new Give & Take theme for the server')
        .addStringOption(option =>
			option
				.setName('name')
				.setDescription('The name of the theme')
				.setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        await interaction.reply({ content: "Hello", fetchReply: true });

        const filter = m => m.author.id === interaction.user.id
        const collector = interaction.channel.createMessageCollector(filter, {max: 1, time: 60000})
        collector.once('collect', async (message) => {
            const embed = new EmbedBuilder()
                .setColor('#1a8175')
                .setTitle(`📖 Dialogue received with success!!`)
                .setDescription(`Dialogue received: ${message.content}`)

            await interaction.channel.send({embeds: [embed]})
        })
    },
};