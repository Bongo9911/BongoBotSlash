const { GameItems, ItemInteractions, GameHistory, Games, UserBadges, sequelize, Badges, Themes, ThemeVotes, ThemeVoteThemes, ThemeItems } = require('../databaseModels.js');
const { Op } = require("sequelize");
const { Channel, EmbedBuilder } = require('discord.js');
const { client } = require('../client');
const fs = require('node:fs');
const { GetGameSettingValue, GetChannelSettingValue } = require('./settingsService.js');

//TODO: add game settings:
//Add ability to halve point totals when a certain % of items have been eliminated
//Add setting to change number of items in final
//Add settings for all constants below

const reactionEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟",
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💗"];

//TODO: add settings to DB
const itemsForFinalVote = 2;
const themeVotingEnabled = true;
const themesPerVote = 10;

async function MakeMove(guildId, channelId, userId, giveName, takeName) {
    const game = await Games.findOne({
        where: {
            guild_id: guildId,
            channel_id: channelId,
            active: true
        }
    });

    if (game && game.status === "SWAPPING") {
        const nextMoveTime = await GetUserNextMoveTime(game.id, userId);

        //Checks to make sure the user is not on cooldown
        if (nextMoveTime > new Date().getTime()) {
            return { message: "You can make another move <t:" + Math.ceil(nextMoveTime / 1000) + ":R>." }
        }

        const giveItem = await GetItem(game.id, giveName);
        const takeItem = await GetItem(game.id, takeName);

        if (giveItem && takeItem) {
            if (giveItem.points > 0 && takeItem.points > 0 && giveItem.id !== takeItem.id) {
                //Increase the number of turns taken in the active game
                await game.increment('turns');
                await game.reload();

                await AddPoints(giveItem, 1);
                await AddPoints(takeItem, -1);

                if (giveItem.points === 2) {
                    await AddSave(game, giveItem, userId);
                }

                if (takeItem.points === 0) {
                    await AddKill(game, takeItem, userId);
                }

                //insert into history table
                await AddHistoryRecord(game, giveItem, userId);
                await AddHistoryRecord(game, takeItem, userId);

                await AddPointSwapCountBadges(game, userId);

                await CheckGameStatus(game);

                const pointsEmbed = await BuildPointsEmbed(game, takeItem);

                return { embed: pointsEmbed };
            }
            else if (giveItem.id === takeItem.id) {
                return { message: "Cannot give to and take from the same item" };
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
    else if (game && game.status === "VOTING") {
        return { message: "Point swaps may not be made while the game is in the voting stage." };
    }
    else {
        return { message: "There is currently no active game in this channel." };
    }
}

/**
 * Get the next time when the user can make a move
 * @param {number} gameId The ID of the game
 * @param {string} userId The ID of the user
 * @returns The date and time the user can next move
 */
async function GetUserNextMoveTime(gameId, userId) {
    const lastUserTurn = await GameHistory.findOne({
        where: {
            game_id: gameId,
            user_id: userId
        },
        order: [['createdAt', 'DESC']],
    });

    const cooldownMinutes = await GetGameSettingValue("CooldownMinutes", gameId);

    if (lastUserTurn) {
        return Date.parse(lastUserTurn.createdAt) + (cooldownMinutes * 60 * 1000);
    }
    else {
        return new Date().getTime();
    }
}

async function GetItem(gameId, item) {
    return await GameItems.findOne({
        where: {
            game_id: gameId,
            [Op.or]: [
                sequelize.where(sequelize.fn('lower', sequelize.col('label')), item),
                sequelize.where(sequelize.fn('lower', sequelize.col('name')), item),
            ]
        }
    });
}

async function AddPoints(item, points) {
    await item.increment('points', { by: points });
    await item.reload();
}

async function AddKill(game, item, userId) {
    await AddInteraction(game, item, userId, "Kill");
    await AddKillCountBadges(game, userId);
    await AddSpecialKillBadges(game, item, userId);

    const lastTake = await GameHistory.findOne({
        order: [['id', 'DESC']],
        where: {
            game_id: game.id,
            item_id: item.id
        }
    });

    //User who kills can't also get assist
    if (lastTake && lastTake.user_id !== userId) {
        await AddInteraction(game, item, lastTake.user_id, "Assist");
        await AddAssistCountBadges(game, lastTake.user_id);
        await AddSpecialAssistBadges(game, item, lastTake.user_id);
    }
}

async function AddSave(game, item, userId) {
    await AddInteraction(game, item, userId, "Save");
    await AddSaveCountBadges(game, userId);
    await AddSpecialSaveBadges(game, item, userId);
}

async function AddKillCountBadges(game, userId) {
    const killCount = await ItemInteractions.count({
        where: {
            guild_id: game.guild_id,
            user_id: userId,
            type: "Kill"
        }
    });

    if (killCount === 1) {
        //1 kill badge - Dead To Me ☠️
        await AddBadge(game, userId, 1);
    }
    else if (killCount === 5) {
        //5 kills - Hunter 🏹
        await AddBadge(game, userId, 4);
    }
    else if (killCount === 10) {
        //10 kills - Hitman 🔫
        await AddBadge(game, userId, 7);
    }
    else if (killCount === 25) {
        //25 kills - Serial Killer 🔪
        await AddBadge(game, userId, 10);
    }
}

async function AddAssistCountBadges(game, userId) {
    const assistCount = await ItemInteractions.count({
        where: {
            guild_id: game.guild_id,
            user_id: userId,
            type: "Assist"
        }
    });

    if (assistCount === 1) {
        //1 assist badge - Helping Hand 🫶
        await AddBadge(game, userId, 3);
    }
    else if (assistCount === 5) {
        //5 assists - True Homie 🫂
        await AddBadge(game, userId, 6);
    }
    else if (assistCount === 10) {
        //10 assists - Here to Help ❤️‍🔥 
        await AddBadge(game, userId, 9);
    }
    else if (assistCount === 25) {
        //25 assists - Partner in Crime 👯
        await AddBadge(game, userId, 12);
    }
}

async function AddSaveCountBadges(game, userId) {
    const saveCount = await ItemInteractions.count({
        where: {
            guild_id: game.guild_id,
            user_id: userId,
            type: "Save"
        }
    });

    if (saveCount === 1) {
        //1 save badge - Savior 😇
        await AddBadge(game, userId, 2);
    }
    else if (saveCount === 5) {
        //5 saves - To The Rescue ⛑️
        await AddBadge(game, userId, 5);
    }
    else if (saveCount === 10) {
        //10 saves - Super Hero 🦸
        await AddBadge(game, userId, 8);
    }
    else if (saveCount === 25) {
        //Knight in Shining Armor 🛡️
        await AddBadge(game, userId, 11);
    }
}

async function AddSpecialKillBadges(game, item, userId) {
    const gameKillCount = await ItemInteractions.count({
        where: {
            game_id: game.id,
            type: "Kill"
        }
    });

    if (gameKillCount === 0 && !(await UserHasBadge(game, userId, 13))) {
        //First blood
        await AddBadge(game, userId, 13);
    }
    else {
        const itemCount = await GameItems.count({
            where: {
                game_id: game.id
            }
        });

        if (gameKillCount === itemCount - 2 && !(await UserHasBadge(game, userId, 14))) {
            //Finishing Blow
            await AddBadge(game, userId, 14);
        }
    }

    const userGameKillCount = await ItemInteractions.count({
        where: {
            game_id: game.id,
            type: "Kill",
            user_id: userId
        }
    });

    if (userGameKillCount === 3 && !(await UserHasBadge(game, userId, 17))) {
        //Triple Kill
        await AddBadge(game, userId, 17);
    }

    const lastKill = await ItemInteractions.findOne({
        order: [['id', 'DESC']],
        where: {
            game_id: game.id,
            item_id: {
                [Op.not]: item.id
            },
            type: "Kill"
        }
    });

    if (lastKill && lastKill.user_id === userId && !(await UserHasBadge(game, userId, 20))) {
        //Two to Tango
        await AddBadge(game, userId, 20);
    }

    const lastSave = await ItemInteractions.findOne({
        order: [['id', 'DESC']],
        where: {
            game_id: game.id,
            item_id: item.id,
            type: "Save"
        }
    });

    if (lastSave && Date.parse(lastSave.createdAt) <= Date.now() - (5 * 60 * 1000) &&
        !(await UserHasBadge(game, userId, 16))) {
        //Memento Mori
        await AddBadge(game, userId, 16);
    }
}

async function AddSpecialSaveBadges(game, item, userId) {
    const saveCount = await ItemInteractions.count({
        where: {
            game_id: game.id,
            item_id: item.id,
            type: "Save"
        }
    });

    if (saveCount >= 2 && !(await UserHasBadge(game, userId, 15))) {
        //Double Trouble
        await AddBadge(game, userId, 15);
    }

    const userGameSaveCount = await ItemInteractions.count({
        where: {
            game_id: game.id,
            type: "Save",
            user_id: userId
        }
    });

    if (userGameSaveCount === 3 && !(await UserHasBadge(game, userId, 18))) {
        //Three's A Crowd
        await AddBadge(game, userId, 18);
    }
}

async function AddSpecialAssistBadges(game, item, userId) {
    const userGameAssistCount = await ItemInteractions.count({
        where: {
            game_id: game.id,
            type: "Assist",
            user_id: userId
        }
    });

    if (userGameAssistCount === 3 && !(await UserHasBadge(game, userId, 19))) {
        //Third Time's The Charm
        await AddBadge(game, userId, 19);
    }
}

async function AddPointSwapCountBadges(game, userId) {
    const userPointSwapCount = (await GameHistory.count({
        where: {
            user_id: userId
        },
        include: {
            model: Games,
            where: {
                guild_id: game.guild_id
            }
        }
    })) / 2;

    if (userPointSwapCount === 1) {
        //Baby's First Swap 👶
        await AddBadge(game, userId, 21);
    } else if (userPointSwapCount === 10) {
        //👦
        await AddBadge(game, userId, 22);
    } else if (userPointSwapCount === 100) {
        //👩
        await AddBadge(game, userId, 23);
    } else if (userPointSwapCount === 1_000) {
        //👴
        await AddBadge(game, userId, 24);
    } else if (userPointSwapCount === 10_000) {
        //🦴
        await AddBadge(game, userId, 25);
    }
}

async function AddBadge(game, userId, badgeId) {
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
        channel.send("<@" + userId + "> Badge awarded - " + badge.emoji + " " + badge.name + "!");
    }
}

async function UserHasBadge(game, userId, badgeId) {
    const userBadge = await UserBadges.findOne({
        where: {
            guild_id: game.guild_id,
            user_id: userId,
            badge_id: badgeId
        }
    });

    return userBadge != null;
}

async function AddInteraction(game, item, userId, type) {
    await ItemInteractions.create({
        game_id: game.id,
        guild_id: game.guild_id,
        user_id: userId,
        type: type,
        theme_name: game.theme_name,
        item_id: item.id
    });
}

async function AddHistoryRecord(game, item, userId) {
    await GameHistory.create({
        game_id: game.id,
        item_id: item.id,
        turn_number: game.turns,
        points: item.points,
        user_id: userId
    })
}

async function CheckGameStatus(game) {
    const items = await GameItems.findAll({
        where: {
            game_id: game.id,
            points: {
                [Op.gt]: 0
            }
        }
    });

    //2 items left, end game
    if (items.length <= itemsForFinalVote) {
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + 12);

        let description = "**Voting ends** <t:" + Math.ceil(endTime.getTime() / 1000) + ":R>\n";

        description += "**Options**\n";

        for (let i = 0; i < items.length; ++i) {
            description += reactionEmojis[i] + " - " + (items[i].emoji ? items[i].emoji + " " : "") + items[i].name + ((i + 1) < items.length ? "\n" : "");
        }

        const pollEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle("📊 FINAL " + itemsForFinalVote + " - React to vote")
            .setDescription(description);

        const channel = client.channels.cache.get(game.channel_id);

        if (channel) {
            let content = "";
            const giveAndTakeRoleID = GetChannelSettingValue("GiveAndTakeRoleID", channel.guildId, channel.id)
            if (giveAndTakeRoleID.length) {
                content = "<@&" + giveAndTakeRoleID + ">"
            }

            const message = await channel.send({ content: content, embeds: [pollEmbed] });

            //Switch to the voting stage
            game.status = "VOTING";
            game.end_time = endTime;
            game.voting_message = message.id;
            await game.save();

            for (let i = 0; i < items.length; ++i) {
                await message.react(reactionEmojis[i]);
            }
        }
    }
}

async function BuildPointsEmbed(game, takeItem) {
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

    let columns = Math.min(Math.ceil(items.length / 20), 3);
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


async function CheckGameVoteStatus() {
    const finishedGames = await Games.findAll({
        where: {
            active: true,
            end_time: {
                [Op.lt]: new Date()
            }
        }
    });

    finishedGames.forEach(async game => {
        const gameItems = await GameItems.findAll({
            where: {
                game_id: game.id,
                points: {
                    [Op.gt]: 0
                }
            }
        });

        if (gameItems.length > 0) {
            const channel = client.channels.cache.get(game.channel_id);
            const voteMessage = await channel.messages.fetch(game.voting_message);

            let reactionCount = [];

            for (let i = 0; i < gameItems.length; ++i) {
                reactionCount.push(voteMessage.reactions.cache.get(reactionEmojis[i]).count - 1);
            }

            let maxReactionCount = Math.max(...reactionCount);

            let winningItems = gameItems.filter((item, i) => reactionCount[i] === maxReactionCount);

            let message = "";

            if (winningItems.length === 1) {
                message = "**" + winningItems[0].name + "** has won the game with " + maxReactionCount + " vote(s)!";
            }
            else if (winningItems.length === gameItems.length) {
                message = "The game has ended in a tie with all items receiving " + maxReactionCount + " vote(s)!";
            }
            else {
                for (let i = 0; i < winningItems.length; ++i) {
                    if (i !== winningItems.length - 1) {
                        message += "**" + winningItems[i].name + "**, ";
                    }
                    else {
                        message += "and **" + winningItems[i].name + "** have tied with " + maxReactionCount + " vote(s)!";
                    }
                }
            }

            await channel.send(message);

            game.active = false;
            await game.save();

            await StartThemeVote(channel);
        }
    });
}

/** 
* Starts a vote for the next game theme
* @param {Channel} channel
*/
async function StartThemeVote(channel) {
    if (!themeVotingEnabled) {
        return;
    }

    const chosenThemes = await Themes.findAll({
        where: {
            guild_id: channel.guildId,
            enabled: true,
            suggestion: false
        },
        limit: themesPerVote,
        order: sequelize.random()
    });

    if (chosenThemes.length) {

        const themeVoteHours = await GetChannelSettingValue("ThemeVoteHours", channel.guildId, channel.id);

        const endTime = new Date();
        endTime.setHours(endTime.getHours() + themeVoteHours);

        let description = "";

        for (let i = 0; i < chosenThemes.length; ++i) {
            description += reactionEmojis[i] + " - " + chosenThemes[i].name + ((i === (chosenThemes.length - 1)) ? "" : "\n");
        }

        const pollEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle("📊 React to vote for the next theme!")
            .setDescription(description);

        let content = "**Voting ends** <t:" + Math.ceil(endTime.getTime() / 1000) + ":R>";

        const giveAndTakeRoleID = await GetChannelSettingValue("GiveAndTakeRoleID", channel.guildId, channel.id)
        if (giveAndTakeRoleID.length && channel.guildId === "279211267443523585") {
            content += "\n<@&" + giveAndTakeRoleID + ">"
        }

        const message = await channel.send({ content: content, embeds: [pollEmbed] });

        for (let i = 0; i < chosenThemes.length; ++i) {
            await message.react(reactionEmojis[i]);
        }

        const themeVote = await ThemeVotes.create({
            guild_id: channel.guildId,
            channel_id: channel.id,
            message_id: message.id,
            end_time: endTime,
            active: true
        });

        for (let i = 0; i < chosenThemes.length; ++i) {
            await ThemeVoteThemes.create({
                theme_vote_id: themeVote.id,
                theme_id: chosenThemes[i].id,
                sequence_number: i
            });
        }
    }
}

async function CheckThemeVoteStatus() {
    const themeVotes = await ThemeVotes.findAll({
        where: {
            active: true,
            end_time: {
                [Op.lt]: new Date()
            }
        }
    });

    themeVotes.forEach(async (themeVote) => {
        const themes = await ThemeVoteThemes.findAll({
            where: {
                theme_vote_id: themeVote.id,
            }
        });

        if (themes.length > 0) {
            console.log(themeVote.channel_id)
            const channel = client.channels.cache.get(themeVote.channel_id);
            const voteMessage = await channel.messages.fetch(themeVote.message_id);

            let reactionCount = [];

            for (let i = 0; i < themes.length; ++i) {
                reactionCount.push(voteMessage.reactions.cache.get(reactionEmojis[themes[i].sequence_number]).count - 1);
            }

            let maxReactionCount = Math.max(...reactionCount);

            let winningTheme = themes.find((item, i) => reactionCount[i] === maxReactionCount);

            const theme = await Themes.findOne({
                where: {
                    id: winningTheme.theme_id
                }
            });

            let message = "**" + theme.name + "** has been chosen as the next theme with " + maxReactionCount + " vote(s)!";

            await channel.send(message);

            themeVote.active = false;
            await themeVote.save();

            const themeItemCount = await ThemeItems.count({
                where: {
                    theme_id: theme.id
                }
            });

            const startingPoints = Math.ceil(150 / themeItemCount);

            const game = await StartGame(theme, startingPoints, themeVote.guild_id, themeVote.channel_id, client.user.id);

            message = "Starting game with theme: **" + theme.name + "**";

            const giveAndTakeRoleID = GetChannelSettingValue("GiveAndTakeRoleID", channel.guildId, channel.id)
            if (giveAndTakeRoleID.length) {
                message += "\n<@&" + giveAndTakeRoleID + ">"
            }

            await channel.send(message);

            const pointsEmbed = await BuildPointsEmbed(game, {id: -1});

            channel.send({ embeds: [pointsEmbed] });
        }
    });
}

async function StartGame(theme, points, guildId, channelId, userId) {
    const game = await Games.create({
        guild_id: guildId,
        channel_id: channelId,
        theme_name: theme.name,
        start_user: userId,
        status: "SWAPPING",
        turns: 0,
        active: true
    });

    const items = await ThemeItems.findAll({
        where: {
            theme_id: theme.id
        }
    });

    for (let i = 0; i < items.length; ++i) {
        const item = await GameItems.create({
            game_id: game.id,
            label: items[i].label,
            name: items[i].name,
            color: items[i].color,
            emoji: items[i].emoji,
            points: points
        });

        await GameHistory.create({
            game_id: game.id,
            item_id: item.id,
            turn_number: 0,
            points: points,
            user_id: null
        });
    }

    theme.enabled = false;
    await theme.save();

    return game;
}

async function CreateBadges() {
    fs.readFile("./badges.json", "utf8", async (err, jsonString) => {
        if (err) {
            console.error("Error readin file: " + err);
            return;
        }
        const badges = JSON.parse(jsonString);
        badges.forEach(async (b) => {
            const badge = await Badges.findOne({
                where: {
                    "id": b.id
                }
            });

            if (!badge) {
                console.log("Creating badge: " + b.name)
                await Badges.create({
                    id: b.id,
                    name: b.name,
                    description: b.description,
                    emoji: b.emoji,
                    image_url: b.image_url
                });
            }
        })
    });
}

exports.MakeMove = MakeMove;
exports.CheckGameVoteStatus = CheckGameVoteStatus;
exports.CreateBadges = CreateBadges;
exports.StartThemeVote = StartThemeVote
exports.CheckThemeVoteStatus = CheckThemeVoteStatus
exports.StartGame = StartGame