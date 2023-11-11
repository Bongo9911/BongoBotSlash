const { SlashCommandBuilder, EmbedBuilder, Interaction } = require('discord.js');
const { Games } = require('../../databaseModels.js');
const { SetGuildSetting, SetChannelSetting, SetGameSetting } = require('../../giveandtake/settingsService.js');

let choices = [
    { name: "Cooldown in Minutes", value: 'CooldownMinutes', game: true },
    { name: "Give and Take Role ID", value: 'GiveAndTakeRoleID', game: false },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setsetting')
        .setDescription('Sets a value for a setting')
        .addSubcommand(subcommand =>
            subcommand
                .setName("guild")
                .setDescription("Sets the value of the setting to be the default for the whole guild")
                .addStringOption(option =>
                    option.setName("setting")
                        .setDescription("The name of the setting to the set the value of")
                        .setRequired(true)
                        .addChoices(
                            ...choices
                        )
                )
                .addStringOption(option =>
                    option.setName("value")
                        .setDescription("The value to set")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("channel")
                .setDescription("Sets the value of the setting to be the default for any future games in this channel")
                .addStringOption(option =>
                    option.setName("setting")
                        .setDescription("The name of the setting to the set the value of")
                        .setRequired(true)
                        .addChoices(
                            ...choices
                        )
                )
                .addStringOption(option =>
                    option.setName("value")
                        .setDescription("The value to set")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("game")
                .setDescription("Sets the value of the setting for the ongoing game")
                .addStringOption(option =>
                    option.setName("setting")
                        .setDescription("The name of the setting to the set the value of")
                        .setRequired(true)
                        .addChoices(
                            ...(choices.filter(c => c.game))
                        )
                )
                .addStringOption(option =>
                    option.setName("value")
                        .setDescription("The value to set")
                        .setRequired(true)
                )
        ),
    /**
     * 
     * @param {Interaction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let settingType = interaction.options.getSubcommand();

        if (settingType === "guild") {
            let result = await SetGuildSetting(interaction.options.getString('setting'), interaction.guildId, interaction.options.getString('value'));

            if (result.result) {
                interaction.followUp({ content: "Guild setting successfuly set" })
            } else {
                interaction.followUp({ content: result.error })
            }
        }
        else if (settingType === "channel") {
            let result = await SetChannelSetting(interaction.options.getString('setting'), interaction.guildId, interaction.channelId, interaction.options.getString('value'));

            if (result.result) {
                interaction.followUp({ content: "Channel setting successfuly set" })
            } else {
                interaction.followUp({ content: result.error })
            }
        }
        else if (settingType === "game") {
            const activeGame = await Games.findOne({
                where: {
                    guild_id: interaction.guildId,
                    channel_id: interaction.channelId,
                    active: true
                }
            });

            if (activeGame) {
                let result = await SetGameSetting(interaction.options.getString('setting'), activeGame.id, interaction.options.getString('value'));

                if (result.result) {
                    interaction.followUp({ content: "Channel setting successfuly set" })
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