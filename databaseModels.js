// Require Sequelize
const Sequelize = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    logging: false,
    // SQLite only
    storage: 'db/database.db',
});

const Games = sequelize.define('games', {
    id: {
        type: Sequelize.INTEGER,
        unique: true,
        autoIncrement: true,
        primaryKey: true
    },
    guild_id: Sequelize.STRING,
    channel_id: Sequelize.STRING,
    theme_name: Sequelize.TEXT,
    start_user: Sequelize.STRING,
    status: Sequelize.STRING, //SWAPPING or VOTING
    turns: Sequelize.INTEGER, //The number of turns in the game
    active: Sequelize.BOOLEAN,
    voting_message: Sequelize.STRING,
    end_time: Sequelize.DATE
},
{
    paranoid: true,
    timestamps: true
});

const GameItems = sequelize.define('game_items', {
    game_id: {
        type: Sequelize.INTEGER,
        references: {
            model: Games,
            key: 'id'
        }
    },
    label: Sequelize.STRING, //AKA id
    name: Sequelize.STRING,
    color: Sequelize.STRING,
    emoji: Sequelize.STRING,
    points: Sequelize.INTEGER,
},
{
    paranoid: true,
    timestamps: true
});

const GameHistory = sequelize.define('game_history', {
    game_id: {
        type: Sequelize.INTEGER,
        references: {
            model: Games,
            key: 'id'
        }
    },
    item_id: Sequelize.INTEGER,
    turn_number: Sequelize.INTEGER,
    points: Sequelize.INTEGER,
    user_id: Sequelize.STRING
},
{
    paranoid: true,
    timestamps: true
});

const ItemInteractions = sequelize.define('item_interactions', {
    game_id: {
        type: Sequelize.INTEGER,
        references: {
            model: Games,
            key: 'id'
        }
    },
    guild_id: Sequelize.STRING,
    user_id: Sequelize.STRING,
    type: Sequelize.STRING, //Kill, Save or Assist
    theme_name: Sequelize.TEXT,
    item_id: Sequelize.INTEGER
},
{
    paranoid: true,
    timestamps: true
});

const Badges = sequelize.define('badges', {
    name: Sequelize.STRING,
    description: Sequelize.STRING,
    emoji: Sequelize.STRING,
    image_url: Sequelize.TEXT
},
{
    paranoid: true,
    timestamps: true
});

const UserBadges = sequelize.define('user_badges', {
    guild_id: Sequelize.STRING,
    user_id: Sequelize.STRING,
    badge_id: {
        type: Sequelize.INTEGER,
        references: {
            model: Badges,
            key: 'id'
        }
    },
},
{
    paranoid: true,
    timestamps: true
});

const Themes = sequelize.define('themes',
    {
        id: {
            type: Sequelize.INTEGER,
            unique: true,
            autoIncrement: true,
            primaryKey: true
        },
        guild_id: Sequelize.STRING,
        name: Sequelize.TEXT,
        created_user: Sequelize.STRING,
        enabled: Sequelize.BOOLEAN,
        suggestion: Sequelize.BOOLEAN
    },
    {
        timestamps: true,
        paranoid: true
    }
);

const ThemeItems = sequelize.define('theme_items', {
    theme_id: {
        type: Sequelize.INTEGER,
        references: {
            model: Themes,
            key: 'id'
        }
    },
    label: Sequelize.STRING, //AKA id
    name: Sequelize.STRING,
    color: Sequelize.STRING,
    emoji: Sequelize.STRING
},
{
    paranoid: true,
    timestamps: true
});

const Users = sequelize.define('users', {
    guild_id: Sequelize.STRING,
    user_id: Sequelize.STRING,
    badge_id: {
        type: Sequelize.INTEGER,
        references: {
            model: Badges,
            key: 'id'
        }
    },
},
{
    paranoid: true,
    timestamps: true
});

const ServerAdmins = sequelize.define('server_admins', {
    guild_id: Sequelize.STRING,
    user_id: Sequelize.STRING,
    added_user: Sequelize.STRING,
},
{
    paranoid: true,
    timestamps: true
});

const GlobalAdmins = sequelize.define('global_admins', {
    user_id: Sequelize.STRING,
    added_user: Sequelize.STRING,
},
{
    paranoid: true,
    timestamps: true
});

const ThemeVotes = sequelize.define('theme_votes', {
    guild_id: Sequelize.STRING,
    channel_id: Sequelize.STRING,
    message_id: Sequelize.STRING,
    end_time: Sequelize.DATE,
    active: Sequelize.BOOLEAN
},
{
    paranoid: true,
    timestamps: true
});

const ThemeVoteThemes = sequelize.define('theme_vote_themes', {
    theme_vote_id: {
        type: Sequelize.INTEGER,
        references: {
            model: ThemeVotes,
            key: 'id'
        }
    },
    theme_id: {
        type: Sequelize.INTEGER,
        references: {
            model: Themes,
            key: 'id'
        }
    },
    sequence_number: Sequelize.INTEGER
},
{
    paranoid: true,
    timestamps: true
});

GameItems.belongsTo(Games, { foreignKey: 'game_id' });
GameHistory.belongsTo(Games, { foreignKey: 'game_id' });

ItemInteractions.belongsTo(Games, { foreignKey: 'game_id' });
ItemInteractions.belongsTo(GameItems, { foreignKey: 'item_id' });

UserBadges.belongsTo(Badges, { sourceKey: "badge_id", foreignKey: 'id' });

ThemeItems.belongsTo(Themes, { foreignKey: "theme_id" });

exports.sequelize = sequelize;
exports.Games = Games;
exports.GameItems = GameItems;
exports.GameHistory = GameHistory;
exports.ItemInteractions = ItemInteractions;
exports.UserBadges = UserBadges;
exports.Themes = Themes;
exports.ThemeItems = ThemeItems;
exports.Users = Users;
exports.ServerAdmins = ServerAdmins;
exports.GlobalAdmins = GlobalAdmins;
exports.Badges = Badges;
exports.ThemeVotes = ThemeVotes;
exports.ThemeVoteThemes = ThemeVoteThemes;