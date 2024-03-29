const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, InteractionResponse } = require('discord.js');
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


console.log(">> Starting CheckpointBot 2.0\n");


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});


client.login(process.env.TOKEN);
client.on('ready', async () => {
    console.log(">> CheckpointBot 2.0 is ready!\n");
    postCheckpoints();
});

//Sends or updates a checkpoint list
async function postCheckpoints() {
    console.log("> Posting Checkpoints");
    //Scrape D2Checkpoints.com for HTML
    var checkpoints = await getCheckpoints();
    //Get channel using the channel's ID
    var channel = client.channels.cache.get(process.env.CHANNEL_ID);
    //Get the last message sent in the given channel
    if (channel == undefined) {console.log(">> ERR: CHANNEL UNDEFINED");}
    else {var lastMsg = (await channel.messages.fetch({ limit: 1 })).last();}

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

//Grabs the checkpoints from https://d2checkpoint.com/ and turns them into discord embeds
async function getCheckpoints() {

    //Get the raw HTML from the webpage.
    var html = (await (await fetch('https://d2checkpoint.com/')).text());
    console.log("> Grabbing current checkpoints");
    //Parse the HTML into a DOM.
    var dom = new jsdom.JSDOM(html);
    //Get all 'card' objects from the DOM.
    var cards = dom.window.document.getElementsByClassName("card");

    //If there are no cards, there are no checkpoints.
    if (cards.length == 0) { 
        console.log("> No checkpoints currently");
        var noCheckpoints = new EmbedBuilder()
            .setTitle("No checkpoints currently")
            .setColor('Blue')
            .setTimestamp();
        return [noCheckpoints];
    }
    else { 
        console.log("> " + cards.length + " checkpoints currently");
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
}

//Styles embeds based on their activity
function styleEmbed(embed) {
    var shortName = embed.data.author.name.substring(0,4);

    if (shortName == "Last") { //Last Wish
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/cfe45e188245bb89a08efa3f481024da.png")
        .setColor('#745B70');
    }
    else if (shortName == "Shat") { //Shattered Throne
        embed.setThumbnail("https://cdn.discordapp.com/emojis/1087166646050885712.webp?size=44&quality=lossless")
        .setColor('#777A79');
    }
    else if (shortName == "Pit ") { //Pit of Heresy
        embed.setThumbnail("https://cdn.discordapp.com/emojis/1087166645115564212.webp?size=44&quality=lossless")
        .setColor('#A71A31');
    }
    else if (shortName == "Vaul") { //Vault of Glass
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/746978970e0d864e0738c8823b430267.png")
        .setColor('#FFFFFF');
    }
    else if (shortName == "Gras") { //Grasp of Avarice
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/4b5030a6799f4a5070571a6d6c2a9cbf.png")
        .setColor('#CEAE33');
    }
    else if (shortName == "Prop") { //Prophecy
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/d2e23b3db794a8226fa417856b5f7f60.png")
        .setColor('#FFFFFF');
    }
    else if (shortName == "Deep") { //Deep Stone Crypt
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/85600cab548e2a5d7c1b9b54e171503f.png")
        .setColor('#DFDDDD');
    }
    else if (shortName == "King") { //King's Fall
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/5f093b0468e0fdc1f073e00dbddbe48a.png")
        .setColor('#CE5045');
    }
    else if (shortName == "Spir") { //Spire of the Watcher
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/e3377923c790bbf82e3562bac4402cc2.png")
        .setColor('#EE4C3F');
    }
    else if (shortName == "Vow ") { //Vow of the Disciple
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/ed4eb907ad758ec164516a07fb4f6241.png")
        .setColor('#666767');
    }
    else if (shortName == "Dual") { //Duality
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/dc4eed95d63fdaf81c87223a56bb67c2.png")
        .setColor('#2B564F');
    }
    else if (shortName == "Gard") { //Garden of Salvation
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/05cb3235ebae6d3f09e196c0e97ae4ea.png")
        .setColor('#9CDBEF');
    }
    else if(shortName == "Root") { //Root of Nightmares
        embed.setThumbnail("https://www.bungie.net/common/destiny2_content/icons/d6cec18c20fa432d23189aecf9a0fcc2.png")
        .setColor('White');
    }
    else { //Unknown Encounter
        embed.setColor('Blue');
    }

    return(embed);
}

//Block for defining user commands
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async (req, res) => {
    const interaction = req.body;
    await client.login(process.env.TOKEN);
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        console.log("> Received "+interaction.data.name+" command from "+interaction.member.user.username);
        if(interaction.data.name == 'update') {
            await postCheckpoints();
            res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data:{
                    content: "Checkpoints updated.", 
                },
            });
        }
    }
});

//Block to register commands with Discord
app.get('/register_commands', async (req,res) =>{
    let slash_commands = [
      {
        "name": "update",
        "description": "Updates checkpoint list.",
        "options": []
      }
    ]
    try
    {
      await discord_api.put(
        `/applications/${process.env.APPLICATION_ID}/guilds/${process.env.GUILD_ID}/commands`,
        slash_commands
      )
      return res.send('commands have been registered')
    }catch(e){
      return res.send(`${e.code} error from discord`)
    }
  })
  app.listen(8999, () => {})