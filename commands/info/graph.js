const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { Themes, ThemeItems, GameHistory, GameItems, Games } = require('../../databaseModels.js');
const QuickChart = require('quickchart-js');

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
        .setDescription('Creates a graph with all the point swaps from the active game'),
    async execute(interaction) {
        await interaction.deferReply();

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

            let skipNum = Math.max(Math.round((activeGame.turns + 1) / 200), 1);

            console.log("building history");

            for (let i = 0; i < items.length; ++i) {
                const history = await GameHistory.findAll({
                    where: {
                        game_id: activeGame.id,
                        item_id: items[i].id
                    },
                    order: [['turn_number', 'ASC']]
                });

                fullData[i] = [];

                for (let h = 0; h < history.length; h += skipNum) {
                    while (fullData[i].length !== Math.floor(history[h].turn_number / skipNum)) {
                        fullData[i].push(fullData[i][fullData[i].length - 1]);
                    }
                    fullData[i].push(history[h].points);
                }

                while (fullData[i].length !== Math.floor((activeGame.turns + 1) / skipNum)) {
                    fullData[i].push(history[history.length - 1].points);
                }
            }

            // for(let i = 0; i < fullData.length; ++i) {
            //     fullData[i] = fullData[i].filter((val, idx) => idx % skipNum === 0);
            // }

            console.log("Full data filtered");

            let datasets = [];

            for (let i = 0; i < items.length; ++i) {
                datasets.push({
                    label: items[i].name,
                    data: fullData[i],
                    fill: false,
                    //TODO: Color is in hex right now, need to convert to RGB
                    borderColor: items[i].color ? ['rgba(' + items[i].color[0] + "," + items[i].color[1] + "," + items[i].color[2] + ", 1)"] :
                        ['rgba(' + Math.round(colors[i % colors.length][0] / (1 + Math.floor(i / colors.length))) + ',' + Math.round(colors[i % colors.length][1] / (1 + Math.floor(i / colors.length)))
                            + ',' + Math.round(colors[i % colors.length][2] / (1 + Math.floor(i / colors.length))) + ', 1)'],
                    backgroundColor: items[i].color ? 'rgba(' + items[i].color[0] + "," + items[i].color[1] + "," + items[i].color[2] + ", 1)" :
                        'rgba(' + Math.round(colors[i % colors.length][0] / (1 + Math.floor(i / colors.length))) + ',' + Math.round(colors[i % colors.length][1] / (1 + Math.floor(i / colors.length)))
                        + ',' + Math.round(colors[i % colors.length][2] / (1 + Math.floor(i / colors.length))) + ', 1)' //0.2
                })
            }

            console.log("datasets built");

            const chart = new QuickChart();
            chart.setConfig({
                type: "line",
                data: {
                    labels: [...Array(fullData[0].length).fill().map((_, idx) => idx * skipNum)],
                    datasets: datasets
                },
                options: {
                    elements: {
                        point: {
                            radius: 0
                        }
                    }
                }
            })
                .setWidth(800)
                .setHeight(600)
                .setVersion("4.3.2");

            const chartURL = await chart.getShortUrl();

            const graphEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle("Point Graph")
                .setImage(chartURL)
                .setTimestamp()
                .setFooter({ text: '/graph', iconURL: 'https://i.imgur.com/kk9lhk3.png' });

            interaction.followUp({ embeds: [graphEmbed] });
        }
        else {
            interaction.followUp({ content: "There is currently no active game in this channel." });
        }
    },
};