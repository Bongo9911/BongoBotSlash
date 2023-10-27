const { SettingsConfig, ChannelSettings, GuildSettings, GameSettings, Games } = require('../databaseModels.js');
const { Op } = require("sequelize");

/**
 * Gets the value for a setting using the guild and channel's settings
 * @param {string} settingName The name of the setting
 * @param {number} gameID The id of the game
 * @returns {string|number|boolean} The value of the setting
 */
async function GetSettingValue(settingName, gameID) {
    const setting = await GetSettingConfigByName(settingName);

    const gameSetting = await GetGameSetting(setting.id, gameID);
    if (gameSetting !== null) {
        return ConvertValueToType(gameSetting.value, setting.setting_type);
    }

    const game = await GetGame(gameID);

    const channelSetting = await GetChannelSetting(setting.id, game.guild_id, game.channel_id);
    if (channelSetting !== null) {
        return ConvertValueToType(channelSetting.value, setting.setting_type);
    }

    const guildSetting = await GetGuildSetting(setting.id, game.guild_id);
    if (guildSetting !== null) {
        return ConvertValueToType(guildSetting.value, setting.setting_type);
    } else {
        return ConvertValueToType(setting.default_value, setting.setting_type);
    }
}

/**
 * Gets the configuration for a setting using its name
 * @param {string} settingName The name of setting
 * @returns The setting configuration
 */
async function GetSettingConfigByName(settingName) {
    return await SettingsConfig.findOne({
        where: {
            setting_name: settingName
        }
    });
}

/**
 * Gets the setting for a guild using the setting id
 * @param {number} settingID The ID of the setting
 * @param {string} guildID The ID of the guild
 * @returns The guild's setting
 */
async function GetGuildSetting(settingID, guildID) {
    return await GuildSettings.findOne({
        where: {
            setting_id: settingID,
            guild_id: guildID
        }
    });
}

/**
 * Gets the setting for a channel using the setting id and guild ID
 * @param {number} settingID The ID of the setting
 * @param {string} guildID The ID of the guild
 * @param {string} channelID The ID of the channel
 * @returns The channel's setting
 */
async function GetChannelSetting(settingID, guildID, channelID) {
    return await ChannelSettings.findOne({
        where: {
            setting_id: settingID,
            guild_id: guildID,
            channel_id: channelID
        }
    });
}

/**
 * Gets the setting for a game using the setting id and game ID
 * @param {number} settingID The ID of the setting
 * @param {number} gameID The ID of the game
 * @returns The game's setting
 */
async function GetGameSetting(settingID, gameID) {
    return await GameSettings.findOne({
        where: {
            setting_id: settingID,
            game_id: gameID
        }
    });
}

async function GetGame(gameID) {
    return await Games.findOne({
        where: {
            id: gameID
        }
    })
}

/**
 * 
 * @param {string} value The value from the database
 * @param {string} type The type of the setting
 * @returns {string|number|boolean} The value of the setting in the appropriate type
 */
function ConvertValueToType(value, type) {
    switch (type) {
        case "INT":
            return parseInt(value);
        case "FLOAT":
            return parseFloat(value);
        case "BOOL":
            return value === "true";
        case "STRING":
        default:
            return value;
    }
}

/**
 * Sets the setting to a specified value for a guild
 * @param {string} settingName The name of the setting
 * @param {string} guildID The ID of the guild
 * @param {string} value The value being set
 * @returns {object} The update results
 */
async function SetGuildSetting(settingName, guildID, value) {
    const settingConfig = await GetSettingConfigByName(settingName);

    value = value.trim();
    const validation = ValidateSettingValue(settingConfig, value);
    if (!validation.valid) {
        return { result: false, error: validation.error };
    }

    const guildSetting = await GetGuildSetting(settingConfig.id, guildID);

    if (guildSetting !== null) {
        guildSetting.value = value;
        await guildSetting.save();
    } else {
        await GuildSettings.create({
            guild_id: guildID,
            setting_id: settingConfig.id,
            value: value
        });
    }

    return { result: true }
}

/**
 * Validates whether a value meets the setting constraints
 * @param {SettingsConfig} settingConfig The config object
 * @param {string} value The value to validate
 * @returns {object} The validation results
 */
function ValidateSettingValue(settingConfig, value) {
    switch (settingConfig.type) {
        case "INT":
            let intValue = parseInt(value);
            if (intValue.toString() !== value) {
                return { valid: false, error: "Setting value is invliad. Must be a whole number." };
            }
            if (intValue > settingConfig.max && settingConfig.max !== -1) {
                return { valid: false, error: "The maximum value for this setting is: " + settingConfig.max };
            }
            if (intValue < settingConfig.min) {
                return { valid: false, error: "The minimum value for this setting is: " + settingConfig.min };
            }
            break;
        case "FLOAT":
            let floatValue = parseFloat(value);
            if (floatValue.toString() !== value) {
                return { valid: false, error: "Setting value is invliad. Must be a number." };
            }
            if (floatValue > settingConfig.max && settingConfig.max !== -1) {
                return { valid: false, error: "The maximum value for this setting is: " + settingConfig.max };
            }
            if (floatValue < settingConfig.min) {
                return { valid: false, error: "The minimum value for this setting is: " + settingConfig.min };
            }
            break;
        case "BOOL":
            value = value.toLowerCase();
            if (value !== "true" && value !== "false") {
                return { valid: false, error: "Valid values for this setting are 'true' or 'false'" };
            }
            break;
        case "STRING":
        default:
            if (value.length > settingConfig.max && settingConfig.max !== -1) {
                return { valid: false, error: "The maximum length for this setting is: " + settingConfig.max };
            }
            if (value.length < settingConfig.min) {
                return { valid: false, error: "The minimum length for this setting is: " + settingConfig.min };
            }
            break;
    }

    return { valid: true };
}

exports.GetSettingValue = GetSettingValue;
exports.SetGuildSetting = SetGuildSetting;