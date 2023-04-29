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
    active: Sequelize.BOOLEAN
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
});

const UserBadges = sequelize.define('user_badges', {
    guild_id: Sequelize.STRING,
    user_id: Sequelize.STRING,
    badge_id: Sequelize.INTEGER
});

const Themes = sequelize.define('themes', {
    id: {
		type: Sequelize.INTEGER,
		unique: true,
        autoIncrement: true,
        primaryKey: true
	},
    guild_id: Sequelize.STRING,
    name: Sequelize.TEXT,
    created_user: Sequelize.STRING,
    enabled: Sequelize.BOOLEAN
});

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
});

const Users = sequelize.define('users', {
	guild_id: Sequelize.STRING,
    user_id: Sequelize.STRING,
    badge_id: Sequelize.INTEGER,
});

const ServerAdmins = sequelize.define('server_admins', {
	guild_id: Sequelize.STRING,
    user_id: Sequelize.STRING,
    added_user: Sequelize.STRING,
});

const GlobalAdmins = sequelize.define('global_admins', {
    user_id: Sequelize.STRING,
    added_user: Sequelize.STRING,
});

const Badges = sequelize.define('badges', {
    name: Sequelize.STRING,
    description: Sequelize.STRING,
    emoji: Sequelize.STRING
});

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