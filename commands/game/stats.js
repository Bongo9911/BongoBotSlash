const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Games, ItemInteractions, GameHistory, sequelize, UserBadges, Badges, Users } = require('../../databaseModels.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('See stats for a user in the server')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to see the stats of, defaults to the user running the command')
                .setRequired(false)),
    async execute(interaction) {
        let user = interaction.options.getUser('user');
        user = user ? user : interaction.user;

        const userInfo = await Users.findOne({
            where: {
                user_id: user.id,
                guild_id: interaction.guildId
            }
        })

        const killCount = await getInteractionCount(user.id, "Kill");
        const saveCount = await getInteractionCount(user.id, "Save");
        const assistCount = await getInteractionCount(user.id, "Assist");
        const swapCount = (await GameHistory.count({
            where: {
                user_id: user.id
            },
            group: ['user_id', 'turn_number']
        })).length;

        const statsEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setAuthor({ name: user.tag, iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`, /*url: 'https://discord.js.org'*/ })
            .addFields(
                { name: 'Kills', value: killCount.toString(), inline: true },
                { name: 'Saves', value: saveCount.toString(), inline: true },
                { name: 'Assists', value: assistCount.toString(), inline: true },
                { name: 'Point Swaps', value: swapCount.toString(), inline: true },
            )

        const badges = await UserBadges.findAll({
            where: {
                guild_id: interaction.guildId,
                user_id: user.id
            }
        });

        if (badges.length) {
            badgeEmojis = "";

            for (let i = 0; i < badges.length; ++i) {
                badgeEmojis += await getBadgeEmoji(badges[i]);
            }

            statsEmbed.addFields(
                { name: 'Badges', value: badgeEmojis, inline: false },
            );
        }

        if (userInfo && 'badge_id' in userInfo && userInfo.badge_id) {
            const featuredBadge = await Badges.findOne({
                where: {
                    id: userInfo.badge_id
                }
            });

            statsEmbed.setThumbnail(featuredBadge.image_url);
        }

        interaction.reply({ embeds: [statsEmbed] });
    },
};

async function getInteractionCount(userId, type) {
    return await ItemInteractions.count({
        where: {
            user_id: userId,
            type: type
        }
    });
}

async function getBadgeEmoji(badge) {
    return (await Badges.findOne({
        where: {
            id: badge.badge_id
        }
    })).emoji;
}