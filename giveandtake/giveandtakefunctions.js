const { GameItems, ItemInteractions, GameHistory } = require('../databaseModels.js');
const { Op } = require("sequelize");
const { EmbedBuilder } = require('@discordjs/builders');

async function makeMove(guildId, channelId, userId, giveName, takeName) {
    //TODO: validate that the user isn't on cooldown

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
            await addPoints(giveItem, 1);
            await addPoints(takeItem, -1);

            if (takeItem.points === 0) {
                await addKill(game, takeItem, userId);
            }

            if (giveItem.points === 2) {
                await addSave(game, giveItem, userId);
            }

            const pointsEmbed = await buildPointsEmbed(game, takeItem);

            //TODO: insert into history table
            //TODO: award badges
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
    })
}

async function addPoints(item, points) {
    await item.increment('points', { by: points });
    await item.reload();
}

async function addKill(game, item, userId) {
    await addInteraction(game, item, userId, "Kill")

    //TODO: add assist
    const lastTake = await GameHistory.findOne({
        attributes: [
            sequelize.fn('MAX', sequelize.col('id'))
        ],
        where: {
            game_id: game.id,
            item_id: takeItem.id
        }
    });

    addInteraction(game, item, lastTake.user_id, "Assist")
}

async function addSave(game, item, userId) {
    await addInteraction(game, item, userId, "Save")
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