const { GameItems, ItemInteractions, GameHistory, Games, UserBadges, sequelize, Badges } = require('../databaseModels.js');
const { Op } = require("sequelize");
const { EmbedBuilder } = require('discord.js');
const { client } = require('../client');

async function makeMove(guildId, channelId, userId, giveName, takeName) {
    const game = await Games.findOne({
        where: {
            guild_id: guildId,
            channel_id: channelId,
            active: true
        }
    });

    //TODO: enable lol
    const cooldownEnabled = false;
    const nextMoveTime = await getUserNextMoveTime(game.id, userId);

    if (cooldownEnabled && nextMoveTime > new Date().getTime()) {
        return { message: "You can make another move <t:" + Math.ceil(nextMoveTime / 1000) + ":R>." }
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
            if (giveItem.points === 0) {
                reply = "Item '" + giveItem.name + "' has no points to give.";
            }
            if (takeItem.points === 0) {
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

    if (lastUserTurn) {
        return Date.parse(lastUserTurn.createdAt) + 3600000;
    }
    else {
        return new Date().getTime();
    }
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
    await addKillCountBadges(game, userId);
    await addSpecialKillBadges(game, item, userId);

    const lastTake = await GameHistory.findOne({
        order: [['id', 'DESC']],
        where: {
            game_id: game.id,
            item_id: item.id
        }
    });

    //User who kills can't also get assist
    if (lastTake && lastTake.user_id !== userId) {
        await addInteraction(game, item, lastTake.user_id, "Assist");
        await addAssistCountBadges(game, userId);
    }
}

async function addSave(game, item, userId) {
    await addInteraction(game, item, userId, "Save");
    await addSaveCountBadges(game, userId);
    await addSpecialSaveBadges(game, item, userId);
}

async function addKillCountBadges(game, userId) {
    const killCount = await ItemInteractions.count({
        where: {
            guild_id: game.guild_id,
            user_id: userId,
            type: "Kill"
        }
    });

    if (killCount === 1) {
        //1 kill badge - Dead To Me ☠️
        await addBadge(game, userId, 1);
    }
    else if (killCount === 5) {
        //5 kills - Hunter 🏹
        await addBadge(game, userId, 4);
    }
    else if (killCount === 10) {
        //10 kills - Hitman 🔫
        await addBadge(game, userId, 7);
    }
    else if (killCount === 25) {
        //25 kills - Serial Killer 🔪
        await addBadge(game, userId, 10);
    }
}

async function addAssistCountBadges(game, userId) {
    const assistCount = await ItemInteractions.count({
        where: {
            guild_id: game.guild_id,
            user_id: userId,
            type: "Assist"
        }
    });

    if (assistCount === 1) {
        //1 assist badge - Helping Hand 🫶
        await addBadge(game, userId, 3);
    }
    else if (assistCount === 5) {
        //5 assists - True Homie 🫂
        await addBadge(game, userId, 6);
    }
    else if (assistCount === 10) {
        //10 assists - Here to Help ❤️‍🔥 
        await addBadge(game, userId, 9);
    }
    else if (assistCount === 25) {
        //25 assists - Partner in Crime 👯
        await addBadge(game, userId, 12);
    }
}

async function addSaveCountBadges(game, userId) {
    const saveCount = await ItemInteractions.count({
        where: {
            guild_id: game.guild_id,
            user_id: userId,
            type: "Save"
        }
    });

    if (saveCount === 1) {
        //1 save badge - Savior 😇
        await addBadge(game, userId, 2);
    }
    else if (saveCount === 5) {
        //5 saves - To The Rescue ⛑️
        await addBadge(game, userId, 5);
    }
    else if (saveCount === 10) {
        //10 saves - Super Hero 🦸
        await addBadge(game, userId, 8);
    }
    else if (saveCount === 25) {
        //Knight in Shining Armor 🛡️
        await addBadge(game, userId, 11);
    }
}

async function addSpecialKillBadges(game, item, userId) {
    const killCount = await ItemInteractions.count({
        where: {
            game_id: game.id,
            type: "Kill"
        }
    });

    if (killCount === 0) {
        //First blood
        await addBadge(game, userId, 13);
    }
    else {
        const itemCount = await GameItems.count({
            where: {
                game_id: game.id
            }
        });

        if (killCount === itemCount - 2) {
            //Finishing Blow
            await addBadge(game, userId, 14);
        }
    }

    const lastSave = await ItemInteractions.findOne({
        order: [['id', 'DESC']],
        where: {
            game_id: game.id,
            item_id: item.id,
            type: "Save"
        }
    });

    if (lastSave && Date.parse(lastSave.createdAt) <= Date.now().getTime() - (5 * 60 * 1000)) {
        //Memento Mori
        await addBadge(game, userId, 16);
    }
}

async function addSpecialSaveBadges(game, item, userId) {
    const saveCount = await ItemInteractions.count({
        where: {
            game_id: game.id,
            item_id: item.id,
            type: "Save"
        }
    });

    if(saveCount >= 2) {
        //Double Trouble
        await addBadge(game, userId, 15);
    }
}

async function addBadge(game, userId, badgeId) {
    await UserBadges.create({
        guild_id: game.guild_id,
        user_id: userId,
        badge_id: badgeId
    });

    const badge = await Badges.findOne({
        where: {
            id: badgeId
        }
    });

    const channel = client.channels.cache.get(game.channel_id);

    if (channel) {
        channel.send("<@" + userId + "> Badge awarded - " + badge.name + "!");
    }
}

async function addInteraction(game, item, userId, type) {
    await ItemInteractions.create({
        game_id: game.id,
        guild_id: game.guild_id,
        user_id: userId,
        type: type,
        theme_name: game.theme_name,
        item_id: item.id
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