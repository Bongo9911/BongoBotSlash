require('dotenv').config({ debug: true });

const { Collection, Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { sequelize } = require('./databaseModels');
const { makeMove, checkVoteStatus, createBadges } = require('./giveandtake/giveandtakefunctions');
const { client } = require('./client');

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			// commands.push(command.data.toJSON());
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.MessageCreate, async message => {
	let content = message.content;
	if ((content.startsWith("+") || content.startsWith("-")) && content.indexOf("+") != -1 && content.indexOf("-") != -1) {
		const giveName = content.split("+")[1].split("-")[0].trim().toLowerCase();
		const takeName = content.split("-")[1].split("+")[0].trim().toLowerCase();
		let reply = await makeMove(message.guildId, message.channelId, message.author.id, giveName, takeName);
		if ("message" in reply) {
			message.reply({ content: reply.message });
		}
		else if ("embed" in reply) {
			message.reply({ embeds: [reply.embed] });
		}
	}
})

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.once(Events.ClientReady, async c => {
	await sequelize.sync();
	console.log(`Ready! Logged in as ${c.user.tag}`);

	await createBadges();
});

client.login(process.env.TOKEN);

//Check every minute if there is any finished games
setInterval(async function() {
	await checkVoteStatus();
}, 60 * 1000);