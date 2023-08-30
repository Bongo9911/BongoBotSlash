const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Themes, ThemeItems } = require('../../databaseModels.js');

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

        let themeName = interaction.options.getString('name').trim();

        let matchingTheme = await Themes.findOne({
            where: {
                guild_id: interaction.guildId,
                name: themeName
            }
        })

        if (!matchingTheme) {
            let themeInfo = {};
            themeInfo.name = themeName;
            await interaction.deferReply();
            getItems(interaction, themeInfo)
        }
        else {
            await interaction.reply({ content: "Theme name already taken, please use a different one" });
        }
    },
};

async function getItems(interaction, themeInfo) {
    const collectorFilter = m => m.author.id === interaction.user.id

    await interaction.followUp({ content: "What items should be in theme '" + themeInfo.name + "'?\nPlease reply with a list of items separated by newlines.", fetchReply: true })
        .then(() => {
            interaction.channel.awaitMessages({ filter: collectorFilter, max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    const message = collected.first();
                    themeInfo.items = message.content.split(/\r?\n/).filter(m => m.trim().length).map(m => m.trim());
                    if (themeInfo.items.length > 2) {
                        getIDs(message, themeInfo);
                    }
                    else {
                        message.reply("Invalid number of items provided. Must have at least 3.");
                        getItems(interaction, themeInfo);
                    }
                })
                .catch(collected => {
                    interaction.followUp('Request Timed Out.');
                });
        });
}

//TODO: verify unique ids
async function getIDs(message, themeInfo) {
    const collectorFilter = m => m.author.id === message.author.id

    await message.reply({
        content: "Would you like to add custom IDs for these items? If not they will be assigned numbers from 1 to " + themeInfo.items.length +
            "\nIf yes, reply with a list of IDs, if no, reply 'NO'", fetchReply: true
    }).then(() => {
        message.channel.awaitMessages({ filter: collectorFilter, max: 1, time: 60000, errors: ['time'] })
            .then(collected => {
                const message = collected.first();
                if (message.content.toUpperCase() === "NO") {
                    themeInfo.ids = Array.from({ length: themeInfo.items.length }, (_, i) => (i + 1).toString());
                    getEmojis(message, themeInfo);
                }
                else {
                    themeInfo.ids = message.content.split(/\r?\n/).filter(m => m.length);
                    if (themeInfo.ids.length === themeInfo.items.length) {
                        getEmojis(message, themeInfo);
                    }
                    else {
                        message.reply("Invalid number of ids provided. Must equal number of items (" + themeInfo.items.length + ").");
                        getIDs(message, themeInfo);
                    }
                }
            })
            .catch(collected => {
                message.reply('Request Timed Out.');
            });
    });
}

async function getEmojis(message, themeInfo) {
    const collectorFilter = m => m.author.id === message.author.id

    await message.reply({
        content: "Would you like to add custom emojis for these items? (Note: Emojis must be default or from a server the bot is in)" +
            "\nIf yes, reply with a list of emojis, if no, reply 'NO'", fetchReply: true
    }).then(() => {
        message.channel.awaitMessages({ filter: collectorFilter, max: 1, time: 60000, errors: ['time'] })
            .then(collected => {
                const message = collected.first();
                if (message.content.toUpperCase() === "NO") {
                    themeInfo.emojis = [];
                    getColors(message, themeInfo);
                }
                else {
                    themeInfo.emojis = message.content.split(/\r?\n/).filter(m => m.length);
                    if (themeInfo.emojis.length === themeInfo.items.length) {
                        getColors(message, themeInfo);
                    }
                    else {
                        message.reply("Invalid number of emojis provided. Must equal number of items (" + themeInfo.items.length + ").");
                        getEmojis(message, themeInfo);
                    }
                }
            })
            .catch(collected => {
                message.reply('Request Timed Out.');
            });
    });
}

async function getColors(message, themeInfo) {
    const collectorFilter = m => m.author.id === message.author.id

    await message.reply({
        content: "Would you like to add custom colors for these items for graphing?" +
            "\nIf yes, reply with a list of hex colors, if no, reply 'NO'", fetchReply: true
    }).then(() => {
        message.channel.awaitMessages({ filter: collectorFilter, max: 1, time: 60000, errors: ['time'] })
            .then(collected => {
                const message = collected.first();
                if (message.content.toUpperCase() === "NO") {
                    themeInfo.colors = [];
                    finishCreateTheme(message, themeInfo);
                }
                else {
                    hexcolors = message.content.split(/\r?\n/).filter(m => m.length);
                    if (hexcolors.length === items.length) {
                        rgbcolors = [];
                        let valid = true;
                        for (let i = 0; i < hexcolors.length; ++i) {
                            if(!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(hexcolors[i])) {
                                message.reply("Invalid hex code: " + hexcolors[i] + " please make sure to include the # at the front of the hex code");
                                getColors(message, themeInfo);
                            }
                            
                        }
                        if (valid) {
                            themeInfo.colors = rgbcolors;
                            finishCreateTheme(message, themeInfo);
                        }
                    }
                    else {
                        message.reply("Invalid number of colors provided. Must equal number of items (" + items.length + ").");
                        getColors(message, themeInfo);
                    }
                }
            })
            .catch(collected => {
                message.reply('Request Timed Out.');
            });
    });
}

async function finishCreateTheme(message, themeInfo) {

    const theme = await Themes.create({ 
        guild_id: message.guildId,
        name: themeInfo.name,
        created_user: message.author.id,
        enabled: true
    });

    for (let i = 0; i < themeInfo.items.length; ++i) {
        await ThemeItems.create({
            theme_id: theme.id,
            label: themeInfo.ids[i],
            name: themeInfo.items[i],
            color: themeInfo.colors.length ? themeInfo.colors[i] : null,
            emoji: themeInfo.emojis.length ? themeInfo.emojis[i] : null
        })
    }

    message.reply("Theme **" + themeInfo.name + "** successfully created.");
}