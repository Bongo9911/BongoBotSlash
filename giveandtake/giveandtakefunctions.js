const { GameItems, ItemInteractions, GameHistory, Games } = require('../databaseModels.js');
const { Op } = require("sequelize");
const { EmbedBuilder } = require('discord.js');

async function makeMove(guildId, channelId, userId, giveName, takeName) {
    //TODO: validate that the user isn't on cooldown using createdAt in game_histories

    const game = await Games.findOne({
        where: {
            guild_id: guildId,
            channel_id: channelId,
            active: true
        }
    });

    const cooldownTime = await getUserNextMoveTime(game.id, userId);
    if (cooldownTime > 0) {
        return { message: "You can send another message <t:" + cooldownTime + ":R>." }
    }

    const giveItem = await getItem(game.id, giveName);
    const takeItem = await getItem(game.id, takeName);

    if (giveItem && takeItem) {
        if (giveItem.points > 0 && takeItem.points > 0) {
            //Increase the number of turns taken in the active game
            await game.increment('turns');
            await game.reload();

            await addPoints(giveItem, 1);
            await addPoints(takeItem, -1);

            if (giveItem.points === 2) {
                await addSave(game, giveItem, userId);
            }

            if (takeItem.points === 0) {
                await addKill(game, takeItem, userId);
            }

            //insert into history table
            await addHistoryRecord(game, giveItem, userId);
            await addHistoryRecord(game, takeItem, userId);

            const pointsEmbed = await buildPointsEmbed(game, takeItem);

            return { embed: pointsEmbed };
        }
        else {
            let reply = "";
            if (!giveItem) {
                reply = "Item '" + giveItem.name + "' has no points to give.";
            }
            if (!takeItem) {
                reply += (reply.length ? "\n" : "") + "Item '" + takeItem.name + "' has no points to take.";
            }
            return { message: reply };
        }
    }
    else {
        let reply = "";
        if (!giveItem) {
            reply = "Item '" + giveName + "' not found.";
        }
        if (!takeItem) {
            reply += (reply.length ? "\n" : "") + "Item '" + takeName + "' not found.";
        }
        return { message: reply };
    }
}

async function getUserNextMoveTime(gameId, userId) {
    const lastUserTurn = await GameHistory.findOne({
        where: {
            game_id: gameId,
            user_id: userId
        },
        order: [['createdAt', 'DESC']],
    });

    const lastMoveTime = Date.parse(lastUserTurn.createdAt);
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - lastMoveTime;
    const nextMoveTime = ((1000 * 60 * 60) - timeDifference) > 0 ? Math.ceil(lastMoveTime / 1000) + 3600 : 0;

    return nextMoveTime;
}

async function getItem(gameId, item) {
    return await GameItems.findOne({
        where: {
            game_id: gameId,
            [Op.or]: [
                {
                    label: item
                },
                {
                    name: item
                }
            ]
        }
    });
}

async function addPoints(item, points) {
    await item.increment('points', { by: points });
    await item.reload();
}

async function addKill(game, item, userId) {
    await addInteraction(game, item, userId, "Kill");
    await addKillCountBadges(game.guild_id, userId);
    //TODO: First blood badge (Fist kill of game)
    //TODO: Finishing Blow badge (Last kill of game)
    //TODO: Memento Mori badge (Kill within 5 minutes of save)

    const lastTake = await GameHistory.findOne({
        attributes: [
            sequelize.fn('MAX', sequelize.col('id'))
        ],
        where: {
            game_id: game.id,
            item_id: item.id
        }
    });

    //User who kills can't also get assist
    if (lastTake.user_id !== userId) {
        await addInteraction(game, item, lastTake.user_id, "Assist");
        await addAssistCountBadges(game.guild_id, userId);
    }
}

async function addSave(game, item, userId) {
    await addInteraction(game, item, userId, "Save");
    await addSaveCountBadges(game.guild_id, userId);
    //TODO: Double Trouble badge
}

async function addKillCountBadges(guildId, userId) {
    const kills = await ItemInteractions.findAll({
        where: {
            guild_id: guildId,
            user_id: userId,
            type: "Kill"
        }
    });

    if (kills.length === "1") {
        //1 kill badge - Murderer
    }
    else if (kills.length === "5") {
        //5 kills - Hunter
    }
    else if (kills.length === "10") {
        //10 kills - Hitman
    }
    else if (kills.length === "25") {
        //25 kills - Serial Killer
    }
}

async function addAssistCountBadges(guildId, userId) {
    const assists = await ItemInteractions.findAll({
        where: {
            guild_id: guildId,
            user_id: userId,
            type: "Assist"
        }
    });

    if (assists.length === "1") {
        //1 assist badge - Helping Hand
    }
    else if (assists.length === "5") {
        //5 assists - True Homie
    }
    else if (assists.length === "10") {
        //10 assists - Sidekick
    }
    else if (assists.length === "25") {
        //25 assists - Partner in Crime
    }
}

async function addSaveCountBadges(guildId, userId) {
    const saves = await ItemInteractions.findAll({
        where: {
            guild_id: guildId,
            user_id: userId,
            type: "Save"
        }
    });

    if (saves.length === "1") {
        //1 save badge - Savior
    }
    else if (saves.length === "5") {
        //5 saves - To The Rescue
    }
    else if (saves.length === "10") {
        //10 saves - Super Hero
    }
    else if (saves.length === "25") {
        //Knight in Shining Armor
    }
}

async function addBadge(guildId, userId, badgeId) {

}

async function addInteraction(game, item, userId, type) {
    await ItemInteractions.create({
        game_id: game.id,
        guild_id: game.guild_id,
        user_id: userId,
        type: type,
        theme_name: game.theme_name,
        item_name: item.name
    });
}

async function addHistoryRecord(game, item, userId) {
    await GameHistory.create({
        game_id: game.id,
        item_id: item.id,
        turn_number: game.turns,
        points: item.points,
        user_id: userId
    })
}

async function buildPointsEmbed(game, takeItem) {
    const items = await GameItems.findAll({
        where: {
            game_id: game.id,
            [Op.or]: [
                {
                    points: {
                        [Op.gt]: 0
                    }
                },
                {
                    id: takeItem.id
                }
            ]
        }
    });

    let columns = Math.ceil(items.length / 20);
    let perColumn = Math.ceil(items.length / columns);

    const pointsEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setFooter({ text: game.turns.toString(), iconURL: 'https://i.imgur.com/kk9lhk3.png' });

    let fields = [];

    for (let i = 0; i < columns; ++i) {
        let pointCol = "";
        for (let j = i * perColumn; j < (i + 1) * perColumn && j < items.length; ++j) {
            if (items[j].points > 0) {
                pointCol += "(" + items[j].label + ") " + (items[j].emoji ? items[j].emoji + " " : "") + items[j].name + " - **" + items[j].points + "**\n";
            }
            else {
                pointCol += "**(" + items[j].label + ") " + (items[j].emoji ? items[j].emoji + " " : "") + items[j].name + " - " + items[j].points + "** :skull:\n";
            }
        }
        if (i == 0) {
            fields.push({ name: "Points", value: pointCol, inline: true });
        }
        else {
            fields.push({ name: "\u200b", value: pointCol, inline: true });
        }
    }

    pointsEmbed.addFields(fields);

    return pointsEmbed;
}

exports.makeMove = makeMove;