// Require Sequelize
const Sequelize = require('sequelize');

const sequelize = new Sequelize({
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'db/database.db',
});

const Games = sequelize.define('games', {
	game_id: {
		type: Sequelize.INTEGER,
		unique: true,
        autoIncrement: true,
        primaryKey: true
	},
	guild_id: Sequelize.STRING,
	channel_id: Sequelize.STRING,
	theme_name: Sequelize.STRING,
	start_time: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
	start_user: Sequelize.STRING,
	status: Sequelize.STRING,
});

exports.sequelize = sequelize;
exports.Games = Games;