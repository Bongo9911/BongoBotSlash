require('dotenv').config({ debug: true });

const Discord = require('discord.js')
const client = new Discord.Client()

const GiphyFetch = require('@giphy/js-fetch-api').GiphyFetch
const gf = new GiphyFetch('sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh') // GIPHY public demo api key: don't use this in production
global.fetch = require('node-fetch') // fetch polyfill needed

client.ws.on('INTERACTION_CREATE', async interaction => {
  const { data: gifs } = await gf.search(interaction.data.options[0].value + ' penguin', { sort: 'relevant', limit: 1, type: interaction.data.options[1] ? 'stickers' : 'gifs' })
  client.api.interactions(interaction.id, interaction.token).callback.post({data: {
    type: 4,
    data: {
      content: gifs[0].embed_url
      }
    }
  })
})

client.login(process.env.TOKEN)