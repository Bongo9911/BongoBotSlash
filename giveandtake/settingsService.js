const { SettingsConfig, ChannelSettings, GuildSettings, GameSettings, Games } = require('../databaseModels.js');
const { Op } = require("sequelize");
const fs = require('node:fs');

/**
 * Gets the value for a setting using the game's, guild's, and channel's settings
 * @param {string} settingName The name of the setting
 * @param {number} gameID The id of the game
 * @returns {string|number|boolean} The value of the setting
 */
async function GetGameSettingValue(settingName, gameID) {
    const setting = await GetSettingConfigByName(settingName);

    const gameSetting = await GetGameSetting(setting.id, gameID);
    if (gameSetting !== null) {
        return ConvertValueToType(gameSetting.value, setting.setting_type);
    }

    const game = await GetGame(gameID);

    return await GetChannelSettingValueFromSetting(setting, game.guild_id, game.channel_id)
}

/**
 * Gets the value for a setting using the guild's and channel's settings
 * @param {string} settingName The name of the setting
 * @param {string} guildID The id of the guild
 * @param {string} channelID The id of the channel
 * @returns {string|number|boolean} The value of the setting
 */
async function GetChannelSettingValue(settingName, guildID, channelID) {
    const setting = await GetSettingConfigByName(settingName);

    return await GetChannelSettingValueFromSetting(setting, guildID, channelID);
}

/**
 * Gets the value for a setting using the guild's and channel's settings and setting config
 * @param {SettingsConfig} setting The setting config
 * @param {string} guildID The id of the guild
 * @param {string} channelID The id of the channel
 * @returns {string|number|boolean} The value of the setting
 */
async function GetChannelSettingValueFromSetting(setting, guildID, channelID) {
    const channelSetting = await GetChannelSetting(setting.id, guildID, channelID);
    if (channelSetting !== null) {
        return ConvertValueToType(channelSetting.value, setting.setting_type);
    }

    return await GetGuildSettingValueFromSetting(setting, guildID);
}

/**
 * Gets the value for a setting using the guild's settings
 * @param {string} settingName The name of the setting
 * @param {string} guildID The id of the guild
 * @returns {string|number|boolean} The value of the setting
 */
async function GetGuildSettingValue(settingName, guildID) {
    const setting = await GetSettingConfigByName(settingName);

    return await GetGuildSettingValueFromSetting(setting, guildID);
}

/**
 * Gets the value for a setting using the guild's settings and setting config
 * @param {SettingsConfig} setting The setting config
 * @param {string} guildID The id of the guild
 * @returns {string|number|boolean} The value of the setting
 */
async function GetGuildSettingValueFromSetting(setting, guildID) {
    const guildSetting = await GetGuildSetting(setting.id, guildID);
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

/**
 * Gets a Give & Take game using the ID of the game
 * @param {number} gameID 
 * @returns {Games} The game object
 */
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
 * Sets the setting to a specified value for a channel
 * @param {string} settingName The name of the setting
 * @param {string} guildID The ID of the guild
 * @param {string} channelID The ID of the channel
 * @param {string} value The value being set
 * @returns {object} The update results
 */
async function SetChannelSetting(settingName, guildID, channelID, value) {
    const settingConfig = await GetSettingConfigByName(settingName);

    value = value.trim();
    const validation = ValidateSettingValue(settingConfig, value);
    if (!validation.valid) {
        return { result: false, error: validation.error };
    }

    const channelSetting = await GetChannelSetting(settingConfig.id, guildID, channelID);

    if (channelSetting !== null) {
        channelSetting.value = value;
        await channelSetting.save();
    } else {
        await ChannelSettings.create({
            guild_id: guildID,
            channel_id: channelID,
            setting_id: settingConfig.id,
            value: value
        });
    }

    return { result: true }
}

/**
 * Sets the setting to a specified value for a guild
 * @param {string} settingName The name of the setting
 * @param {number} gameID the id of the game
 * @param {string} value The value being set
 * @returns {object} The update results
 */
async function SetGameSetting(settingName, gameID, value) {
    const settingConfig = await GetSettingConfigByName(settingName);

    value = value.trim();
    const validation = ValidateSettingValue(settingConfig, value);
    if (!validation.valid) {
        return { result: false, error: validation.error };
    }

    const gameSetting = await GetGameSetting(settingConfig.id, gameID);

    if (gameSetting !== null) {
        gameSetting.value = value;
        await gameSetting.save();
    } else {
        await GameSettings.create({
            game_id: gameID,
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

/**
 * Reads the settings.json file to create any non-existant settings
 */
async function CreateSettingsIfNotExist() {
    fs.readFile("./settings.json", "utf8", async (err, jsonString) => {
        if (err) {
            console.error("Error readin file: " + err);
            return;
        }
        const settings = JSON.parse(jsonString);
        settings.forEach(async (s) => {
            const setting = await SettingsConfig.findOne({
                where: {
                    "id": s.id
                }
            });

            if (!setting) {
                console.log("Creating setting: " + s.setting_name)
                await SettingsConfig.create({
                    id: s.id,
                    setting_name: s.setting_name,
                    default_value: s.default_value,
                    setting_type: s.setting_type,
                    min: s.min,
                    max: s.max
                });
            }
        })
    });
}

exports.GetGameSettingValue = GetGameSettingValue;
exports.GetChannelSettingValue = GetChannelSettingValue;
exports.GetGuildSettingValue = GetGuildSettingValue;
exports.SetGuildSetting = SetGuildSetting;
exports.SetChannelSetting = SetChannelSetting;
exports.SetGameSetting = SetGameSetting;
exports.CreateSettingsIfNotExist = CreateSettingsIfNotExist;