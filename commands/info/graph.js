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

        // interaction.followUp({ content: "This command is currently disabled" });
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

            for (let i = 0; i < items.length; ++i) {
                const history = await GameHistory.findAll({
                    where: {
                        game_id: activeGame.id,
                        item_id: items[i].id
                    },
                    order: [['turn_number', 'ASC']]
                });

                fullData[i] = [];

                let historyIndex = 0;
                for (let h = 0; h <= activeGame.turns; h += skipNum) {
                    while (history[historyIndex].turn_number < h && historyIndex !== history.length - 1) {
                        historyIndex++;
                    }

                    if (history[historyIndex].turn_number <= h || historyIndex === 0) {
                        fullData[i].push(history[historyIndex].points);
                    }
                    else {
                        fullData[i].push(history[historyIndex - 1].points);
                    }
                }
            }

            let datasets = [];

            for (let i = 0; i < items.length; ++i) {
                let rgbColor = hexToRgb(items[i].color);

                datasets.push({
                    label: items[i].name,
                    data: fullData[i],
                    fill: false,
                    //TODO: Color is in hex right now, need to convert to RGB
                    borderColor: rgbColor ? ['rgba(' + rgbColor.r + "," + rgbColor.g + "," + rgbColor.b + ", 1)"] :
                        ['rgba(' + Math.round(colors[i % colors.length][0] / (1 + Math.floor(i / colors.length))) + ',' + Math.round(colors[i % colors.length][1] / (1 + Math.floor(i / colors.length)))
                            + ',' + Math.round(colors[i % colors.length][2] / (1 + Math.floor(i / colors.length))) + ', 1)'],
                    backgroundColor: rgbColor ? 'rgba(' + rgbColor.r + "," + rgbColor.g + "," + rgbColor.b + ", 1)" :
                        'rgba(' + Math.round(colors[i % colors.length][0] / (1 + Math.floor(i / colors.length))) + ',' + Math.round(colors[i % colors.length][1] / (1 + Math.floor(i / colors.length)))
                        + ',' + Math.round(colors[i % colors.length][2] / (1 + Math.floor(i / colors.length))) + ', 1)' //0.2
                })
            }

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

            interaction.editReply({ embeds: [graphEmbed] });
        }
        else {
            interaction.editReply({ content: "There is currently no active game in this channel." });
        }
    },
};

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}