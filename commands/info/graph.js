const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { Themes, ThemeItems, GameHistory, GameItems, Games } = require('../../databaseModels.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

let colors = [
    [255, 0, 0],
    [255, 106, 0],
    [255, 216, 0],
    [182, 255, 0],
    [76, 255, 0],
    [0, 255, 144],
    [0, 255, 255],
    [0, 148, 255],
    [0, 38, 255],
    [101, 0, 255],
    [178, 0, 255],
    [255, 0, 220],
    [255, 0, 110],
    [255, 127, 127],
    [255, 178, 127],
    [255, 233, 127],
    [218, 255, 127],
    [165, 255, 127],
    [127, 255, 142],
    [127, 255, 197],
    [127, 201, 255],
    [127, 146, 255],
    [161, 127, 255],
    [214, 127, 255],
    [255, 127, 237],
    [255, 127, 182]
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('graph')
        .setDescription('Shows information about a theme'),
    async execute(interaction) {

        const activeGame = await Games.findOne({
            where: {
                guild_id: interaction.guildId,
                channel_id: interaction.channelId,
                active: true
            }
        });

        if (activeGame) {
            const items = await GameItems.findAll({
                where: {
                    game_id: activeGame.id
                }
            })

            let fullData = [];

            for (let i = 0; i < items.length; ++i) {
                const history = await GameHistory.findAll({
                    where: {
                        game_id: activeGame.id,
                        item_id: items[i].id
                    },
                    order: [['turn_number', 'ASC']]
                });

                fullData[i] = [];

                for (let h = 0; h < history.length; ++h) {
                    while (fullData[i].length !== history[h].turn_number) {
                        fullData[i].push(fullData[i][fullData[i].length - 1]);
                    }
                    fullData[i].push(history[h].points);
                }

                while (fullData[i].length !== activeGame.turns + 1) {
                    fullData[i].push(fullData[i][fullData[i].length - 1]);
                }
            }

            let datasets = [];

            for (let i = 0; i < items.length; ++i) {
                datasets.push({
                    label: items[i].name,
                    data: fullData[i],
                    //TODO: Color is in hex right now, need to convert to RGB
                    borderColor: items[i].color ? ['rgba(' + items[i].color[0] + "," + items[i].color[1] + "," + items[i].color[2] + ", 1)"] :
                        ['rgba(' + Math.round(colors[i % colors.length][0] / (1 + Math.floor(i / colors.length))) + ',' + Math.round(colors[i % colors.length][1] / (1 + Math.floor(i / colors.length)))
                            + ',' + Math.round(colors[i % colors.length][2] / (1 + Math.floor(i / colors.length))) + ', 1)'],
                    backgroundColor: items[i].color ? 'rgba(' + items[i].color[0] + "," + items[i].color[1] + "," + items[i].color[2] + ", 1)" :
                        'rgba(' + Math.round(colors[i % colors.length][0] / (1 + Math.floor(i / colors.length))) + ',' + Math.round(colors[i % colors.length][1] / (1 + Math.floor(i / colors.length)))
                        + ',' + Math.round(colors[i % colors.length][2] / (1 + Math.floor(i / colors.length))) + ', 1)' //0.2
                })
            }

            const renderer = new ChartJSNodeCanvas({ width: 800, height: 600, backgroundColour: 'white' });
            renderer.renderToBuffer({
                // Build your graph passing option you want
                type: "line", // Show a line chart
                backgroundColor: "rgba(236,197,1)",
                data: {
                    labels: [...Array(fullData[0].length).fill().map((_, idx) => idx)],
                    datasets: datasets
                },
                options: {
                    elements: {
                        point: {
                            radius: 0
                        }
                    }
                }
            }).then(image => {
                const attachment = new AttachmentBuilder(image, { name: "graph.png" });

                const graphEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle("Point Graph")
                    .setImage('attachment://graph.png')
                    .setTimestamp()
                    .setFooter({ text: '/graph', iconURL: 'https://i.imgur.com/kk9lhk3.png' });

                interaction.reply({ embeds: [graphEmbed], files: [attachment] });
            })
        }
        else {
            interaction.reply("There is not active game in this channel.");
        }
    },
};