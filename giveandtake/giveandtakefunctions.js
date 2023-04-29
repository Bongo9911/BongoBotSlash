const { GameItems, ItemInteractions, GameHistory } = require('../databaseModels.js');
const { Op } = require("sequelize");
const { EmbedBuilder } = require('@discordjs/builders');

async function makeMove(guildId, channelId, userId, giveName, takeName) {
    //TODO: validate that the user isn't on cooldown using createdAt in game_histories

    const game = await Games.findOne({
        where: {
            guild_id: guildId,
            channel_id: channelId,
            active: true
        }
    });

    const giveItem = await getItem(game.id, giveName);
    const takeItem = await getItem(game.id, takeName);

    if (giveItem && takeItem) {
        if (giveItem.points > 0 && takeItem.points > 0) {
            //Increase the number of turns taken in the active game
            await game.increment('turns');
            await game.reload();
            
            await addPoints(giveItem, 1);
            await addPoints(takeItem, -1);

            //TODO: award badges
            if (giveItem.points === 2) {
                await addSave(game, giveItem, userId);
            }

            if (takeItem.points === 0) {
                await addKill(game, takeItem, userId);
            }

            const pointsEmbed = await buildPointsEmbed(game, takeItem);

            //insert into history table
            await addHistoryRecord(game, giveItem, userId);
            await addHistoryRecord(game, takeItem, userId);

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
            reply = "Item '" + interaction.options.getString('give') + "' not found.";
        }
        if (!takeItem) {
            reply += (reply.length ? "\n" : "") + "Item '" + interaction.options.getString('take') + "' not found.";
        }
        return { message: reply };
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

    //TODO: make sure last user isn't equal to user getting kill (you can't assist yourself)
    const lastTake = await GameHistory.findOne({
        attributes: [
            sequelize.fn('MAX', sequelize.col('id'))
        ],
        where: {
            game_id: game.id,
            item_id: takeItem.id
        }
    });

    addInteraction(game, item, lastTake.user_id, "Assist");
}

async function addSave(game, item, userId) {
    await addInteraction(game, item, userId, "Save");
    await addSaveBadges(game.guild_id, userId);
}

async function addSaveBadges(guildId, userId) {
    const saves = ItemInteractions.findAll({
        where: {
            guild_id: guildId,
            user_id: userId,
            type: "Save"
        }
    });

    if(saves.length === "1") {
        //1 save badge 
    }
    else if(saves.length === "5") {
        //5 saves
    }
    else if(saves.length === "10") {

    }
    else if(saves.length === "25") {

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
        .setColor('#0099ff');

    for (let i = 0; i < columns; ++i) {
        let pointCol = "";
        for (let j = i * perColumn; j < (i + 1) * perColumn && j < items.length; ++j) {
            if(items[j].points > 0) {
                pointCol += "(" + items[j].label + ") " + (items[j].emoji ? items[j].emoji + " " : "") + items[j].name + " - **" + items[j].points + "**\n";
            }
            else {
                pointCol += "**(" + items[j].label + ") " + (items[j].emoji ? items[j].emoji + " " : "") + items[j].name + " - " + items[j].points + "** :skull:\n";
            }
        }
        if (i == 0) {
            pointsEmbed.addField("Points", pointCol, true);
        }
        else {
            pointsEmbed.addField("\u200b", pointCol, true);
        }
    }

    return pointsEmbed;
}

exports.makeMove = makeMove;