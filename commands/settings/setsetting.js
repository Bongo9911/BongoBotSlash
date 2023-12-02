const { SlashCommandBuilder, EmbedBuilder, Interaction } = require('discord.js');
const { Games } = require('../../databaseModels.js');
const { SetGuildSetting, SetChannelSetting, SetGameSetting } = require('../../giveandtake/settingsService.js');

let settingDefs = [
    { alias: "cooldowninminutes", cleanName: "Cooldown In Minutes", name: 'CooldownMinutes', game: true, type: "integer", description: "The number of minutes a user must wait before making another point swap" },
    { alias: "giveandtakerole", cleanName: "Give & Take Role", name: 'GiveAndTakeRoleID', game: false, type: "role", description: "The role used to ping for Give & Take games and votes" },
    { alias: "themevotehours", cleanName: "Theme Vote Length In Hours", name: 'ThemeVoteHours', game: false, type: "integer", description: "The number of hours a theme vote will last" },
];

const settingCommand = new SlashCommandBuilder()
    .setName('setsetting')
    .setDescription('Sets a value for a setting')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

settingDefs.forEach(choice => {
    settingCommand.addSubcommand(subcommand => {
        subcommand = subcommand
            .setName(choice.alias)
            .setDescription(choice.description)
            .addStringOption(option => {
                option = option.setName("scope")
                    .setDescription("Where this setting will take effect")
                    .setRequired(true);

                if (choice.game) {
                    option = option.addChoices({ name: "guild", value: "guild" }, { name: "channel", value: "channel" }, { name: "game", value: "game" });
                } else {
                    option = option.addChoices({ name: "guild", value: "guild" }, { name: "channel", value: "channel" });
                }
                return option
            });

        switch (choice.type) {
            case "string":
                subcommand = subcommand.addStringOption(option =>
                    option.setName("value")
                        .setDescription("The value to set")
                        .setRequired(true)
                );
                break;
            case "number":
                subcommand = subcommand.addNumberOption(option =>
                    option.setName("value")
                        .setDescription("The value to set")
                        .setRequired(true)
                );
                break;
            case "integer":
                subcommand = subcommand.addIntegerOption(option =>
                    option.setName("value")
                        .setDescription("The value to set")
                        .setRequired(true)
                );
                break;
            case "role":
                subcommand = subcommand.addRoleOption(option =>
                    option.setName("value")
                        .setDescription("The value to set")
                        .setRequired(true)
                );
                break;
            default:
                break;
        }

        return subcommand;
    });
});

module.exports = {
    data: settingCommand,
    /**
     * 
     * @param {Interaction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let settingAlias = interaction.options.getSubcommand();
        const settingDef = settingDefs.find(s => s.alias === settingAlias);
        let settingName = settingDef.name;

        let settingValue;

        console.log(settingDef.type);
        console.log(interaction.options);

        switch (settingDef.type) {
            case "string":
                settingValue = interaction.options.getString("value");
                break;
            case "number":
                settingValue = interaction.options.getNumber("value").toString();
                break;
            case "integer":
                settingValue = interaction.options.getInteger("value").toString();
                break;
            case "role":
                settingValue = interaction.options.getRole("value").id.toString();
                break;
            default:
                break;
        }

        let settingScope = interaction.options.getString("scope");

        if (settingScope === "guild") {
            let result = await SetGuildSetting(settingName, interaction.guildId, settingValue);

            if (result.result) {
                interaction.followUp({ content: `Guild setting '${settingDef.cleanName}' successfuly set` })
            } else {
                interaction.followUp({ content: result.error })
            }
        }
        else if (settingScope === "channel") {
            let result = await SetChannelSetting(settingName, interaction.guildId, interaction.channelId, settingValue);

            if (result.result) {
                interaction.followUp({ content: `Channel setting '${settingDef.cleanName}' successfuly set` })
            } else {
                interaction.followUp({ content: result.error })
            }
        }
        else if (settingScope === "game") {
            const activeGame = await Games.findOne({
                where: {
                    guild_id: interaction.guildId,
                    channel_id: interaction.channelId,
                    active: true
                }
            });

            if (activeGame) {
                let result = await SetGameSetting(settingName, activeGame.id, settingValue);

                if (result.result) {
                    interaction.followUp({ content: `Game setting '${settingDef.cleanName}' successfuly set` })
                } else {
                    interaction.followUp({ content: result.error })
                }
            }
            else {
                interaction.followUp({ content: "There is currently no active game in this channel" })
            }
        }
    },
};