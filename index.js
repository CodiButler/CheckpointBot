const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { waitForDebugger } = require('inspector');
const jsdom = require("jsdom");
require("dotenv").config();
const express = require ("express");
const app = express();
const { getTextNodeContent } = require('jsdom/lib/jsdom/living/domparsing/parse5-adapter-serialization');
const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');
const { join } = require('path');


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

    //If you don't have a channel ID, use the server and channel name environment variable.
    //If you do have the channel ID, use the environment variable.
    const useChannelID = true;
    if (useChannelID) { var channel = getChannelUsingID(process.env.CHANNEL_ID); } 
    else {
        var guild = getGuildUsingName(process.env.SERVER_NAME);
        var channel = getChannelUsingName(guild, process.env.CHANNEL_NAME);
    }

    //Get the last message sent in the given channel
    var lastMsg = (await channel.messages.fetch({ limit: 1 })).last();
    //If the bot sent the last message, update it. Otherwise, send a new one.
    if (lastMsg != undefined && lastMsg.author.id == client.user.id) {
        updateCheckpoints(lastMsg, {embeds: checkpoints}) 
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
    var outputEmbeds = [];
    //Go through each card and grab the checkpoint info and join code then format them into discord embeds.
    for (var x = 0; x < cards.length; x++) {
        var cardBody = cards[x];
        var checkpointInfo = cardBody.childNodes[3];
        var checkpointEncounter = checkpointInfo.childNodes[1].textContent;
        var checkpointActivity = checkpointInfo.childNodes[3].textContent;
        var checkpointFireteamSize = checkpointInfo.childNodes[5].textContent;
        var joinCode = "/join " + cardBody.childNodes[5].textContent.replace(/\n/g, '');

        if (checkpointActivity.substring(0,4) == "Last") {
            var checkpoint = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(checkpointEncounter)
                .setAuthor({name: checkpointActivity})
                .setDescription(joinCode)
                .setFooter({text: checkpointFireteamSize})
                .setThumbnail("https://www.bungie.net/common/destiny2_content/icons/cfe45e188245bb89a08efa3f481024da.png")
                .setTimestamp();
            outputEmbeds.push(checkpoint);
        }
        else if (checkpointActivity.substring(0,4) == "Prop") {
            var checkpoint = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(checkpointEncounter)
                .setAuthor({name: checkpointActivity})
                .setDescription(joinCode)
                .setFooter({text: checkpointFireteamSize})
                .setThumbnail("https://www.bungie.net/common/destiny2_content/icons/d2e23b3db794a8226fa417856b5f7f60.png")
                .setTimestamp();
            outputEmbeds.push(checkpoint);
        }
        else if (checkpointActivity.substring(0,4) == "Deep") {
            var checkpoint = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(checkpointEncounter)
                .setAuthor({name: checkpointActivity})
                .setDescription(joinCode)
                .setFooter({text: checkpointFireteamSize})
                .setThumbnail("https://www.bungie.net/common/destiny2_content/icons/85600cab548e2a5d7c1b9b54e171503f.png")
                .setTimestamp();
            outputEmbeds.push(checkpoint);
        }
        else if (checkpointActivity.substring(0,4) == "King") {
            var checkpoint = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(checkpointEncounter)
                .setAuthor({name: checkpointActivity})
                .setDescription(joinCode)
                .setFooter({text: checkpointFireteamSize})
                .setThumbnail("https://www.bungie.net/common/destiny2_content/icons/5f093b0468e0fdc1f073e00dbddbe48a.png")
                .setTimestamp();
            outputEmbeds.push(checkpoint);
        }
        else if (checkpointActivity.substring(0,4) == "Spir") {
            var checkpoint = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(checkpointEncounter)
                .setAuthor({name: checkpointActivity})
                .setDescription(joinCode)
                .setFooter({text: checkpointFireteamSize})
                .setThumbnail("https://www.bungie.net/common/destiny2_content/icons/e3377923c790bbf82e3562bac4402cc2.png")
                .setTimestamp();
            outputEmbeds.push(checkpoint);
        }
        else {
            var checkpoint = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(checkpointEncounter)
                .setAuthor({name: checkpointActivity})
                .setDescription(joinCode)
                .setFooter({text: checkpointFireteamSize})
                .setTimestamp();
            outputEmbeds.push(checkpoint);
        }

        
    }

    //Log when checkpoints were grabbed.
    var timestamp = Date.now();
    var now = new Date(timestamp);
    console.log("> Grabbed checkpoints on "+ now.toLocaleString());

    //
    return (outputEmbeds);
}


async function updateCheckpoints(message, updatedMsg) {
    console.log("> Updating checkpoint message\n")
    await message.edit(updatedMsg);
}


function getGuildUsingName(server_name) {
    //Get list of all servers the bot is in.
    const guilds = client.guilds.cache.entries();
    var found = false;
    var guildID = 0;
    //Get a server's ID given its name.
    while (!found) {
        var guildInfo = guilds.next().value[1];
        if (guildInfo.name == server_name) { guildID = guildInfo.id; found = true; }
        else if (guildInfo == undefined) { console.log(">> SERVER NOT FOUND"); }
    }

    //Return a guild object using its ID.
    return (client.guilds.cache.get(guildID));
}


function getChannelUsingName(guild, channel_name) {
    //Get channels iterator for a given server.
    var channels = guild.channels.cache.entries()
    found = false;
    var channelID = 0;
    //Get a channel's ID given its name.
    while (!found) {
        var channelInfo = channels.next().value[1];
        if (channelInfo.name == channel_name) { channelID = channelInfo.id; found = true; }
        else if (channelInfo == undefined) { console.log(">> CHANNEL NOT FOUND"); }
    }

    //Return channel object using its ID.
    return (getChannelUsingID(channelID));
}


function getChannelUsingID(channel_id) {
    return (client.channels.cache.get(channel_id));
}


app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;
});
