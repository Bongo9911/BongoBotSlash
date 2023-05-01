const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Games, ItemInteractions, GameHistory, sequelize } = require('../../databaseModels.js');

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
        const user = interaction.options.getUser('user');
        const userId = user ? user.id : interaction.user.id;

        console.log("User id is:" + userId);

        const killCount = await getInteractionCount(userId, "Kill");
        const saveCount = await getInteractionCount(userId, "Save");
        const assistCount = await getInteractionCount(userId, "Assist");
        const moveCount = (await GameHistory.count({
            where: {
                user_id: userId
            },
            group: ['user_id', 'turn_number']
        })).length;

        console.log("Move count: " + moveCount);

        console.log("Kill count: " + killCount);

        interaction.reply({ content: "Hi" });
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