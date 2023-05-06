require('dotenv').config({ debug: true });

const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { sequelize, Games } = require('./databaseModels');
const { makeMove } = require('./giveandtake/giveandtakefunctions');
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
    console.log(message);
    let content = message.content;
    if((content.startsWith("+") || content.startsWith("-")) && content.indexOf("+") != -1 && content.indexOf("-") != -1) {
        const giveName = content.split("+")[1].split("-")[0].trim().toLowerCase();
        const takeName = content.split("-")[1].split("+")[0].trim().toLowerCase();
        let reply = await makeMove(message.guildId, message.channelId, message.author.id, giveName, takeName);
        if ("message" in reply) {
            message.reply({ content: reply.message });
        }
        else if("embed" in reply) {
            message.reply({ embeds: [reply.embed] });
        }
        //TODO: embed
    }
})

client.on(Events.InteractionCreate, async interaction => {
    // await Games.create({
    //     guild_id: "389594278470615062",
    //     channel_id: "389594279758135317",
    //     theme_name: "Test Theme",
    //     start_user: "200313450319052801",
    //     status: "ACTIVE"
    // })

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
});

client.login(process.env.TOKEN);