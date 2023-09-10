const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Badges, UserBadges, Users } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setbadge')
        .setDescription('Sets your featured badge')
        .addStringOption(option =>
            option
                .setName('badge')
                .setDescription('The name of the badge to feature')
                .setRequired(true)),
    async execute(interaction) {

        const badgeName = interaction.options.getString('badge').trim();

        const badge = await Badges.findOne({
            where: {
                name: badgeName
            }
        });

        if(badge) {
            const userBadge = await UserBadges.findOne({
                where: {
                    user_id: interaction.user.id,
                    badge_id: badge.id,
                    guild_id: interaction.guildId
                }
            });

            if(userBadge) {
                const user = await Users.findOne({
                    where: {
                        guild_id: interaction.guildId,
                        user_id: interaction.user.id
                    }
                });
                if(user) {
                    user.badge_id = badge.id;
                    await user.save();
                }
                else {
                    await Users.create({
                        guild_id: interaction.guildId,
                        user_id: interaction.user.id,
                        badge_id: badge.id
                    });
                }
                await interaction.reply({ content: "Featured badge successfully set to: " + badgeName });
            }
            else {
                await interaction.reply({ content: "You do not have the badge " + badgeName });
            }
        }
        else {
            await interaction.reply({ content: "Badge: " + badgeName + " does not exist" });
        }
    },
};