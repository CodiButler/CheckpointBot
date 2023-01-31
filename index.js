const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { waitForDebugger } = require('inspector');
const jsdom = require("jsdom");
require("dotenv").config();
const express = require ("express");
const app = express();
const { getTextNodeContent } = require('jsdom/lib/jsdom/living/domparsing/parse5-adapter-serialization');
const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');
const { join } = require('path');
const axios = require('axios')
const discord_api = axios.create({
    baseURL: 'https://discord.com/api/',
    timeout: 3000,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
      "Access-Control-Allow-Headers": "Authorization",
      "Authorization": `Bot ${process.env.TOKEN}`
    }
  });


console.log(">> Starting CheckpointBot 1.0\n");


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});


client.login(process.env.TOKEN);
client.on('ready', async () => {
    console.log(">> Successfully started CheckpointBot 1.0\n");
    postCheckpoints();
});


async function postCheckpoints() {

    //Scrape D2Checkpoints.com for HTML
    var checkpoints = await getCheckpoints();
    //Get channel using the channel's ID
    var channel = client.channels.cache.get(process.env.CHANNEL_ID);
    //Get the last message sent in the given channel
    var lastMsg = (await channel.messages.fetch({ limit: 1 })).last();

    //If the bot sent the last message, update it. Otherwise, send a new one.
    if (lastMsg != undefined && lastMsg.author.id == client.user.id) {
        console.log("> Updating checkpoint message\n")
        lastMsg.edit({embeds: checkpoints}); 
    }
    else {
        console.log("> Sending checkpoint message\n");
        channel.send({embeds: checkpoints});
    }
}


async function getCheckpoints() {

    //Get the raw HTML from the webpage.
    var html = (await (await fetch('https://d2checkpoint.com/')).text());
    console.log("> Grabbing current checkpoints from https://d2checkpoint.com/");
    //Parse the HTML into a DOM.
    var dom = new jsdom.JSDOM(html);
    //Get all 'card' objects from the DOM.
    var cards = dom.window.document.getElementsByClassName("card");

    //If there are no cards, there are no checkpoints.
    if (cards.length == 0) { var outputMessage = "> *No checkpoints currently*\n"; console.log(outputMessage.replace(/\n/g, '')); }
    else { console.log("> " + cards.length + " checkpoints currently"); var outputMessage = ""; }
    var embedList = [];

    //Go through each card
    for (var x = 0; x < cards.length; x++) {
        //Get the activity, encounter, fireteam size, and join code from each card.
        var cardBody = cards[x];
        var checkpointInfo = cardBody.childNodes[3];
        var checkpointEncounter = checkpointInfo.childNodes[1].textContent;
        var checkpointActivity = checkpointInfo.childNodes[3].textContent;
        var checkpointFireteamSize = checkpointInfo.childNodes[5].textContent;
        var joinCode = "/join " + cardBody.childNodes[5].textContent.replace(/\n/g, '');

        //Build an embed with relevant info
        var checkpoint = new EmbedBuilder()
                .setTitle(checkpointEncounter)
                .setAuthor({name: checkpointActivity})
                .setDescription(joinCode)
                .setFooter({text: checkpointFireteamSize})
                .setTimestamp();

        //Add a thumbnail and color based on activity location
        embedList.push(styleEmbed(checkpoint));
    }

    //Log when checkpoints were grabbed.
    var timestamp = Date.now();
    var now = new Date(timestamp);
    console.log("> Grabbed checkpoints on "+ now.toLocaleString());

    //Return list of embeds
    return (embedList);
}


function styleEmbed(embed) {
    var shortAct = embed.data.author.name.substring(0,4);

    if (shortAct == "Last") { //Last Wish
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/cfe45e188245bb89a08efa3f481024da.png")
        .setColor('#745B70');
    }
    else if (shortAct == "Prop") { //Prophecy
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/d2e23b3db794a8226fa417856b5f7f60.png")
        .setColor('#FFFFFF');
    }
    else if (shortAct == "Deep") { //Deep Stone Crypt
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/85600cab548e2a5d7c1b9b54e171503f.png")
        .setColor('#D1484E');
    }
    else if (shortAct == "King") { //King's Fall
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/5f093b0468e0fdc1f073e00dbddbe48a.png")
        .setColor('#CE5045');
    }
    else if (shortAct == "Spir") { //Spire of the Watcher
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/e3377923c790bbf82e3562bac4402cc2.png")
        .setColor('#ED4F44');
    }
    else { //Unknown Encounter
        embed.setColor('Blue');
    }

    return(embed);
}


//Unused block for user commands
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async (req, res) => {
    const interaction = req.body;

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      console.log(interaction.data.name)
      if(interaction.data.name == 'yo'){
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Yo ${interaction.member.user.username}!`,
          },
        });
      }
  
      if(interaction.data.name == 'dm'){
        // https://discord.com/developers/docs/resources/user#create-dm
        let c = (await discord_api.post(`/users/@me/channels`,{
          recipient_id: interaction.member.user.id
        })).data
        try{
          // https://discord.com/developers/docs/resources/channel#create-message
          let res = await discord_api.post(`/channels/${c.id}/messages`,{
            content:'Yo! I got your slash command. I am not able to respond to DMs just slash commands.',
          })
          console.log(res.data)
        }catch(e){
          console.log(e)
        }
  
        return res.send({
          // https://discord.com/developers/docs/interactions/receiving-and-responding#responding-to-an-interaction
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data:{
            content:'👍'
          }
        });
      }
    }
});

app.get('/register_commands', async (req,res) =>{
    let slash_commands = [
      {
        "name": "yo",
        "description": "replies with Yo!",
        "options": []
      },
      {
        "name": "dm",
        "description": "sends user a DM",
        "options": []
      }
    ]
    try
    {
      // api docs - https://discord.com/developers/docs/interactions/application-commands#create-global-application-command
      let discord_response = await discord_api.put(
        `/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`,
        slash_commands
      )
      console.log(discord_response.data)
      return res.send('commands have been registered')
    }catch(e){
      console.error(e.code)
      console.error(e.response?.data)
      return res.send(`${e.code} error from discord`)
    }
  })
  
  
  app.get('/', async (req,res) =>{
    return res.send('Follow documentation ')
  })

  app.listen(8999, () => {

  })