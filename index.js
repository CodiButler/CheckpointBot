const { Client, GatewayIntentBits, messageLink } = require('discord.js');
const { waitForDebugger } = require('inspector');
const jsdom = require("jsdom");
require("dotenv").config();
const { getTextNodeContent } = require('jsdom/lib/jsdom/living/domparsing/parse5-adapter-serialization');

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
    setInterval(postCheckpoints, 5000);
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
    if (lastMsg != undefined || lastMsg.author.id == client.user.id) {
        updateCheckpoints(lastMsg, checkpoints) 
    }
    else {
        console.log("> Sending checkpoint message\n");
        channel.send(checkpoints);
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

    //Go through each card and grab the checkpoint info and join code then format.
    for (var x = 0; x < cards.length; x++) {
        var cardBody = cards[x];
        var checkpointInfo = (cardBody.childNodes[3].textContent.replace(/\n/g, '    ').substring(2)) + "\n";
        var joinCode = "`/join " + cardBody.childNodes[5].textContent.replace(/\n/g, '') + "`";
        outputMessage += "> " + checkpointInfo + "> " + joinCode + "\n> \n";
    }

    //Add a clientside timestamp, format once more, and return string of formatted checkpoints.
    var timestamp = Date.now();
    var now = new Date(timestamp);
    console.log("> Grabbed checkpoints on "+ now.toLocaleString());
    return (outputMessage + "> *Updated <t:" + (timestamp / 1000).toPrecision(10) + ":F>*");
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


