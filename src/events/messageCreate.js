/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:22:24
 * @Last Modified by: stupid cat
 * @Last Modified time: 2019-07-29 17:55:23
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const moment = require('moment-timezone');
const bbEngine = require('../structures/bbtag/Engine');
const bbtag = require('../core/bbtag');
const Timer = require('../structures/Timer');
const util = require('util');
const request = require('request');

bot.on('messageCreate', async function (msg) {
    if (!msg.guild || (msg.guild && !msg.guild.shard.ready)) return;
    bu.Metrics.messageCounter.inc();
    await bu.processUser(msg.author);
    let storedGuild = await bu.getGuild(msg.guild.id);
    if (storedGuild && storedGuild.settings.makelogs)
        bu.insertChatlog(msg, 0);

    if (msg.author.id == bot.user.id) handleOurMessage(msg);

    if (msg.member && msg.channel.id === config.discord.channel)
        handleIRCMessage(msg);

    if (msg.author.id !== bot.user.id) handleUserMessage(msg, storedGuild);

});

async function handleUserMessage(msg, storedGuild) {
    let prefix, prefixes = [];
    let storedUser = await bu.getCachedUser(msg.author.id);
    if (storedUser && storedUser.prefixes)
        prefixes.push(...storedUser.prefixes);

    if (msg.guild && storedGuild != null) {
        handleAntiMention(msg, storedGuild);
        bu.handleCensor(msg, storedGuild);
        handleRoleme(msg, storedGuild);
        handleAutoresponse(msg, storedGuild, true);
        handleTableflip(msg);
        if (Array.isArray(storedGuild.settings.prefix)) {
            prefixes.push(...storedGuild.settings.prefix);
        } else if (storedGuild.settings.prefix != undefined)
            prefixes.push(storedGuild.settings.prefix);
    };
    prefixes.push(config.discord.defaultPrefix, 'blargbot');
    prefixes.sort((a, b) => {
        return b.length - a.length; //Sort descending
    });
    if (await handleBlacklist(msg, storedGuild)) return;

    var doCleverbot = false;
    if (msg.content.startsWith(`<@${bot.user.id}>`) || msg.content.startsWith(`<@!${bot.user.id}>`)) {
        prefix = msg.content.match(/<@!?[0-9]{17,21}>/)[0];
        console.debug('Was a mention');
        doCleverbot = true;
    } else {
        for (const p of prefixes) {
            if (msg.content.toLowerCase().startsWith(p.toLowerCase())) {
                prefix = p; break;
            }
        }
    }
    let wasCommand = false;
    if (prefix != undefined && msg.content.toLowerCase().startsWith(prefix.toLowerCase())) {
        if (storedUser && storedUser.blacklisted) {
            await bu.send(msg, 'You have been blacklisted from the bot for the following reason: ' + storedUser.blacklisted);
            return;
        }
        var command = msg.content.substring(prefix.length).trim();
        try {
            wasCommand = await handleDiscordCommand(msg.channel, msg.author, command, msg);
            if (wasCommand) {
                // logCommand(msg);

                if (msg.guild) {
                    handleDeleteNotif(msg, storedGuild);
                }
            } else {
                if (doCleverbot && !msg.author.bot && !storedGuild.settings.nocleverbot) {
                    handleCleverbot(msg);
                } else {
                    handleAwaitMessage(msg);
                }
            }
        } catch (err) {
            console.error(err.stack);
        }
    } else {
        handleAwaitMessage(msg);
    }
    if (!wasCommand)
        handleAutoresponse(msg, storedGuild, false);
}

/**
 * Sends a message to irc
 * @param msg - the message to send (String)
 */
function sendMessageToIrc(msg) {
    bot.sender.send('ircMessage', msg);
}

var tables = {
    flip: {
        prod: [
            'Whoops! Let me get that for you ┬──┬﻿ ¯\\\\_(ツ)',
            '(ヘ･_･)ヘ┳━┳ What are you, an animal?',
            'Can you not? ヘ(´° □°)ヘ┳━┳',
            'Tables are not meant to be flipped ┬──┬ ノ( ゜-゜ノ)',
            '(ﾉ´･ω･)ﾉ ﾐ ┸━┸ Wheee!',
            '┻━┻ ︵ヽ(`Д´)ﾉ︵﻿ ┻━┻ Get these tables out of my face!',
            '┻━┻ミ＼(≧ﾛ≦＼) Hey, catch!',
            'Flipping tables with elegance! (/¯◡ ‿ ◡)/¯ ~ ┻━┻'
        ]
    },
    unflip: {
        prod: [
            '┬──┬﻿ ¯\\\\_(ツ) A table unflipped is a table saved!',
            '┣ﾍ(≧∇≦ﾍ)… (≧∇≦)/┳━┳ Unflip that table!',
            'Yay! Cleaning up! ┣ﾍ(^▽^ﾍ)Ξ(ﾟ▽ﾟ*)ﾉ┳━┳',
            'ヘ(´° □°)ヘ┳━┳ Was that so hard?',
            '(ﾉ´･ω･)ﾉ ﾐ ┸━┸ Here comes the entropy!',
            'I\'m sorry, did you just pick that up? ༼ﾉຈل͜ຈ༽ﾉ︵┻━┻',
            'Get back on the ground! (╯ರ ~ ರ）╯︵ ┻━┻',
            'No need to be so serious! (ﾉ≧∇≦)ﾉ ﾐ ┸━┸'
        ]
    }
};

var flipTables = async function (msg, unflip) {
    let tableflip = await bu.guildSettings.get(msg.channel.guild.id, 'tableflip');
    if (tableflip && tableflip != 0) {
        var seed = bu.getRandomInt(0, 3);
        bu.send(msg,
            tables[unflip ? 'unflip' : 'flip'].prod[seed]);
    }
};

let lastUpdated;
let maxTime;
let timeoutDuration;
let maxExecutions;
let penalty;
const commandUsage = {};
const timedOut = {};
async function exceededRatelimit(msg) {
    if (!lastUpdated || lastUpdated <= Date.now() + (10 * 60 * 1000)) {
        let globalRatelimit = await r.table('vars').get('globalRatelimit');
        if (!globalRatelimit) {
            globalRatelimit = {
                maxTime: 30 * 1000,
                timeoutDuration: 60000 * 10,
                maxExecutions: 15,
                penalty: 5000,
                varname: 'globalRatelimit'
            };
            await r.table('vars').insert(globalRatelimit);
        }

        maxTime = globalRatelimit.maxTime;
        timeoutDuration = globalRatelimit.timeoutDuration;
        maxExecutions = globalRatelimit.maxExecutions;
        penalty = globalRatelimit.penalty;
        lastUpdated = Date.now();
    }
    if (timedOut[msg.author.id]) {
        if (Date.now() < timedOut[msg.author.id]) {
            timedOut[msg.author.id] += 5000;
            return true;
        } else {
            delete timedOut[msg.author.id];
        }
    }

    if (!commandUsage[msg.author.id]) {
        commandUsage[msg.author.id] = [];
    }
    commandUsage[msg.author.id] = commandUsage[msg.author.id].filter(d => d >= Date.now() - maxTime);
    commandUsage[msg.author.id].push(Date.now());

    if (commandUsage[msg.author.id].length >= maxExecutions) {
        timedOut[msg.author.id] = Date.now() + timeoutDuration;
        await bu.send(msg, 'Sorry, you\'ve been running too many commands. To prevent abuse, I\'m going to have to time you out.\n\nContinuing to spam commands will lengthen your timeout!');
        return true;
    }

    return false;
}

var handleDiscordCommand = async function (channel, user, text, msg) {
    let words = bu.splitInput(text);
    if (words.length === 0) return;
    let outputLog = '';
    if (msg.channel.guild)
        outputLog = `Command '${text}' executed by ${user.username} (${user.id}) on server ${msg.channel.guild.name} (${msg.channel.guild.id})`;
    else
        outputLog = `Command '${text}' executed by ${user.username} (${user.id}) in a PM (${msg.channel.id}) Message ID: ${msg.id}`;

    if (msg.author.bot) {
        return false;
    }
    let val = await bu.ccommand.get(msg.channel.guild ? msg.channel.guild.id : '', words[0].toLowerCase());
    let alias = false;
    if (val && val.alias) {
        alias = val.alias;
        let auth = val.authorizer;
        val = await r.table('tag').get(alias);
        val.authorizer = auth;
    }
    if (val && val.content) {
        let ccommandName = words[0].toLowerCase();
        let ccommandContent;
        let author, authorizer;
        if (typeof val == "object") {
            ccommandContent = val.content;
            author = val.author;
            authorizer = val.authorizer;
        } else {
            ccommandContent = val;
            await bu.ccommand.set(msg.guild.id, ccommandName, {
                content: ccommandContent
            });
        }

        if (await bu.canExecuteCcommand(msg, ccommandName, true)) {
            if (await exceededRatelimit(msg)) {
                console.command(outputLog, `[IGNORED ${Math.floor((timedOut[msg.author.id] - Date.now()) / 10) / 100}s]`);
                return;
            }
            console.command(outputLog);
            let command = text.replace(words[0], '').trim();
            command = bu.fixContent(command);
            if (alias !== false) {
                await r.table('tag').get(alias).update({
                    uses: val.uses + 1,
                    lastuse: r.now()
                }).run();
            }
            await bbEngine.runTag({
                msg,
                limits: new bbtag.limits.ccommand(),
                tagContent: ccommandContent,
                flags: val.flags,
                input: command,
                isCC: true,
                tagVars: alias !== false,
                tagName: ccommandName,
                cooldown: val.cooldown,
                author,
                authorizer
            });
            bu.Metrics.commandCounter.labels('custom', 'custom').inc();

            return true;
        }
    } else {
        let _command = CommandManager.commandList[words[0].toLowerCase()];
        if (_command) {
            let commandName = _command.name;
            let _built = CommandManager.built[commandName];
            let { executable } = await bu.canExecuteCommand(msg, commandName);
            if (executable) {
                if (await exceededRatelimit(msg)) {
                    console.command(outputLog, `[IGNORED ${Math.floor((timedOut[msg.author.id] - Date.now()) / 10) / 100}s]`);
                    return;
                }
                try {
                    console.command(outputLog);
                    let timer = new Timer().start();
                    await executeCommand(commandName, msg, words, text);
                    timer.end();
                    bu.Metrics.commandLatency.labels(commandName, bu.CommandType.properties[_built.category].name.toLowerCase()).observe(timer.elapsed);
                    bu.Metrics.commandCounter.labels(commandName, bu.CommandType.properties[_built.category].name.toLowerCase()).inc();
                } catch (err) {
                    console.error(err.stack);
                    bu.Metrics.commandError.labels(commandName).inc();
                }
            }
            return executable;
        } else {
            return false;
        }
    }
};
var executeCommand = async function (commandName, msg, words, text) {
    try {
        await CommandManager.built[commandName]._execute(msg, words, text);
    } catch (err) {
        console.error(err);
        if (err.code !== undefined) {
            let dmMsg;
            switch (err.code) {
                case 50001:
                    dmMsg = `Hi! You asked me to do something, but I didn't have permission to do it! Please make sure I have permissions to do what you asked.`;
                    break;
            }
            let storedUser = await r.table('user').get(msg.author.id);
            if (dmMsg && !storedUser.dontdmerrors)
                bu.sendDM(msg, dmMsg + '\nGuild: ' + msg.guild.name + '\nChannel: ' + msg.channel.name + '\nCommand: ' + msg.content + '\n\nIf you wish to stop seeing these messages, do the command `dmerrors`.');
        }
        throw err;
    }
    return true;
};



function handleOurMessage(msg) {
    if (msg.channel.id != '194950328393793536')
        if (msg.guild)
            console.output(`${msg.channel.guild.name} (${msg.channel.guild.id})> ${msg.channel.name} ` +
                `(${msg.channel.id})> ${msg.author.username}> ${msg.content} (${msg.id})`);
        else
            console.output(`PM> ${msg.channel.name} (${msg.channel.id})> ` +
                `${msg.author.username}> ${msg.content} (${msg.id})`);
}

function handleIRCMessage(msg) {
    if (!(msg.author.id == bot.user.id && msg.content.startsWith('\u200B'))) {
        var message;
        if (msg.content.startsWith('_') && msg.content.endsWith('_'))
            message = ` * ${msg.member && msg.member.nick ? msg.member.nick : msg.author.username} ${msg.cleanContent
                .substring(1, msg.cleanContent.length - 1)}`;
        else {
            if (msg.author.id == bot.user.id) {
                message = `${msg.cleanContent}`;
            } else {
                message = `\<${msg.member && msg.member.nick ? msg.member.nick : msg.author.username}\> ${msg.cleanContent}`;
            }
        }
        console.output(message);
        var attachUrl = '';
        if (msg.attachments.length > 0) {
            console.debug(util.inspect(msg.attachments[0]));
            attachUrl += ` ${msg.attachments[0].url}`;
        }
        sendMessageToIrc(message + attachUrl);
    }
}

async function handleAntiMention(msg, storedGuild) {
    let antimention;
    antimention = storedGuild.settings.antimention;
    var parsedAntiMention = parseInt(antimention);
    if (!(parsedAntiMention == 0 || isNaN(parsedAntiMention))) {
        if (msg.mentions.length >= parsedAntiMention) {
            if (!bu.bans[msg.channel.guild.id])
                bu.bans[msg.channel.guild.id] = {};

            bu.bans[msg.channel.guild.id][msg.author.id] = {
                mod: bot.user,
                type: 'Auto-Ban',
                reason: 'Mention spam'
            };
            try {
                await bot.banGuildMember(msg.channel.guild.id, msg.author.id, 1);
            } catch (err) {
                delete bu.bans[msg.channel.guild.id][msg.author.id];
                bu.send(msg, `${msg.author.username} is mention spamming, but I lack the permissions to ban them!`);
            }
            return;
        }
    }
}

bu.handleCensor = async function handleCensor(msg, storedGuild) {
    let censor = storedGuild.censor;
    if (censor && censor.list.length > 0) {
        //First, let's check exceptions
        let exceptions = censor.exception;
        if (!(exceptions.channel.includes(msg.channel.id) ||
            exceptions.user.includes(msg.author.id) ||
            (exceptions.role.length > 0 && bu.hasRole(msg, exceptions.role)))) { // doesn't have an exception!
            for (const cens of censor.list) {
                let violation = false;
                let term = cens.term;
                if (cens.regex) {
                    try {
                        let regex = bu.createRegExp(term);
                        if (regex.test(msg.content)) violation = true;
                    } catch (err) { }
                } else if (msg.content.toLowerCase().indexOf(term.toLowerCase()) > -1) violation = true;
                if (violation == true) { // Uh oh, they did a bad!
                    let res = await bu.issueWarning(msg.author, msg.guild, cens.weight);
                    if (cens.weight > 0) {
                        await bu.logAction(msg.guild, msg.author, bot.user, 'Auto-Warning', cens.reason || 'Said a blacklisted phrase.', bu.ModLogColour.WARN, [{
                            name: 'Warnings',
                            value: `Assigned: ${cens.weight}\nNew Total: ${res.count || 0}`,
                            inline: true
                        }]);
                    }
                    try {
                        await msg.delete();
                    } catch (err) {
                        // bu.send(msg, `${bu.getFullName(msg.author)} said a blacklisted word, but I was not able to delete it.`);
                    }
                    let content = '';
                    switch (res.type) {
                        case 0:
                            if (cens.deleteMessage) content = cens.deleteMessage;
                            else if (censor.rule.deleteMessage) content = censor.rule.deleteMessage;
                            else content = CommandManager.built['censor'].defaultDeleteMessage;
                            break;
                        case 1:
                            if (cens.banMessage) content = cens.banMessage;
                            else if (censor.rule.banMessage) content = censor.rule.banMessage;
                            else content = CommandManager.built['censor'].defaultBanMessage;
                            break;
                        case 2:
                            if (cens.kickMessage) content = cens.kickMessage;
                            else if (censor.rule.kickMessage) content = censor.rule.kickMessage;
                            else content = CommandManager.built['censor'].defaultKickMessage;
                            break;
                    }
                    await bbEngine.runTag({
                        msg,
                        limits: new bbtag.limits.ccommand(),
                        tagContent: content,
                        input: msg.content,
                        isCC: true,
                        tagName: 'censor'
                    });
                }
            }
        }
    }
};

async function handleRoleme(msg, storedGuild) {
    if (storedGuild && storedGuild.roleme) {
        let roleme = storedGuild.roleme.filter(m => m.channels.indexOf(msg.channel.id) > -1 || m.channels.length == 0);
        if (roleme.length > 0) {
            for (let i = 0; i < roleme.length; i++) {
                let caseSensitive = roleme[i].casesensitive;
                let message = roleme[i].message;
                let content = msg.content;
                if (!caseSensitive) {
                    message = message.toLowerCase();
                    content = content.toLowerCase();
                }
                if (message == content) {
                    // console.info(`A roleme was triggered > ${msg.guild.name} (${msg.guild.id}) > ${msg.channel.name} (${msg.channel.id}) > ${msg.author.username} (${msg.author.id})`);
                    let roleList = msg.member.roles;
                    let add = roleme[i].add;
                    let del = roleme[i].remove;
                    for (let ii = 0; ii < add.length; ii++) {
                        if (roleList.indexOf(add[ii]) == -1) roleList.push(add[ii]);
                    }
                    for (let ii = 0; ii < del.length; ii++) {
                        if (roleList.indexOf(del[ii]) > -1) roleList.splice(roleList.indexOf(del[ii]), 1);
                    }
                    try {
                        await msg.member.edit({
                            roles: roleList
                        });
                        console.verbose(roleme[i].output);
                        await bbEngine.runTag({
                            msg,
                            limits: new bbtag.limits.ccommand(),
                            tagContent: roleme[i].output || 'Your roles have been edited!',
                            input: '',
                            isCC: true,
                            tagName: 'roleme'
                        });
                    } catch (err) {
                        bu.send(msg, 'A roleme was triggered, but I don\'t have the permissions required to give you your role!');
                    }
                }
            }
        }
    }
}
let arWhitelist = [];

async function checkWhitelist() {
    let { values } = await r.table('vars').get('arwhitelist');
    arWhitelist = values;
}
setInterval(checkWhitelist, 1000 * 60 * 15);
checkWhitelist();

function defaultMember(msg, tag) {
    if (!msg.member) {
        const id = tag.authorizer || tag.author;
        const member = msg.guild.members.get(id);
        if (!member) return false;
        msg.member = member;
    }
    return true;
}

async function handleAutoresponse(msg, storedGuild, everything = false) {
    if (!arWhitelist.includes(msg.guild.id)) return; // selective whitelist for now
    if (!msg.member && msg.author.discriminator !== '0000') {
        // skip over non-members who aren't webhooks
        return;
    }

    if (storedGuild && storedGuild.autoresponse) {
        let ars = storedGuild.autoresponse;
        let m = {
            ...msg,
            guild: msg.guild
        };

        if (everything && ars.everything && storedGuild.ccommands[ars.everything.executes]) {
            const tag = storedGuild.ccommands[ars.everything.executes];
            if (!defaultMember(m, tag)) return;
            await bbEngine.runTag({
                msg: m,
                limits: new bbtag.limits.autoresponse_everything(),
                tagContent: tag.content,
                author: tag.author,
                input: m.content,
                isCC: true,
                tagName: ars.everything.executes,
                silent: true
            });
        }
        if (!everything && ars.list.length > 0) {
            for (const ar of ars.list) {
                let cont = false;
                let matches;
                if (ar.regex) {
                    try {
                        let exp = bu.createRegExp(ar.term);

                        matches = m.content.match(exp);
                        if (matches !== null) {
                            cont = true;
                            matches.map(m => '"' + m.replace(/"/g, '\\"') + '"');
                            if (matches.length === 1) matches = null;
                        }
                    } catch (err) {
                        console.log(err);
                        bu.send(msg, 'Unsafe or invalid regex! Terminating.');
                        return;
                    }
                } else cont = m.content.includes(ar.term);

                if (cont && storedGuild.ccommands[ar.executes]) {
                    const tag = storedGuild.ccommands[ar.executes];
                    if (!defaultMember(msg, tag)) return;
                    await bbEngine.runTag({
                        msg: m,
                        limits: new bbtag.limits.autoresponse_general(),
                        tagContent: tag.content,
                        author: tag.author,
                        input: matches || m.content,
                        isCC: true,
                        tagName: ar.executes
                    });
                }
            }
        }
    }
}

async function handleBlacklist(msg, storedGuild, prefix) {
    let blacklisted;
    if (msg.guild && storedGuild && storedGuild.channels[msg.channel.id])
        blacklisted = storedGuild.channels[msg.channel.id].blacklisted;

    return (blacklisted && !(await bu.isUserStaff(msg.author.id, msg.guild.id)));
}

function logCommand(msg) {
    bu.send('243229905360388106', {
        embed: {
            description: msg.content,
            fields: [{
                name: msg.guild ? msg.guild.name : 'DM',
                value: msg.guild ? msg.guild.id : 'null',
                inline: true
            }, {
                name: msg.channel.name || 'DM',
                value: msg.channel.id,
                inline: true
            }],
            author: {
                name: bu.getFullName(msg.author),
                icon_url: msg.author.avatarURL,
                url: `https://blargbot.xyz/user/${msg.author.id}`
            },
            timestamp: moment(msg.timestamp),
            footer: {
                text: `MsgID: ${msg.id}`
            }
        }
    });
}

function handleDeleteNotif(msg, storedGuild) {
    let deletenotif = storedGuild.settings.deletenotif;
    if (deletenotif != '0') {
        if (!bu.commandMessages[msg.channel.guild.id]) {
            bu.commandMessages[msg.channel.guild.id] = [];
        }
        bu.commandMessages[msg.channel.guild.id].push(msg.id);
        if (bu.commandMessages[msg.channel.guild.id].length > 100) {
            bu.commandMessages[msg.channel.guild.id].shift();
        }
    }
}

const cleverCache = {};

function query(input) {
    return new Promise((res, rej) => {
        request.post(config.cleverbot.endpoint, {
            form: { input }
        }, (err, re, bod) => {
            if (err) rej(err);
            else {
                let content = bod.match(/<font size="2" face="Verdana" color=darkred>(.+)<\/font>/);
                if (content)
                    res(content[1].replace(/(\W)alice(\W)/gi, '$1blargbot$2').replace(/<br>/gm, '\n'));
                else res('Hi, I\'m blargbot! It\'s nice to meet you.');
            }
        });
    });
}

async function handleCleverbot(msg) {
    await bot.sendChannelTyping(msg.channel.id);
    var username = msg.channel.guild.members.get(bot.user.id).nick ?
        msg.channel.guild.members.get(bot.user.id).nick :
        bot.user.username;
    var msgToSend = msg.cleanContent.replace(new RegExp('@' + '\u200b' + username + ',?'), '').trim();
    bu.cleverbotStats++;
    updateStats();
    try {
        let response = await query(msgToSend);
        await bu.sleep(1500);
        await bu.send(msg, response);
    } catch (err) {
        // NO-OP
    }
}

async function updateStats() {
    let today = moment().format('YYYY-MM-DD');
    if (!bu.cleverStats[today]) {
        let storedStats = await r.table('vars').get('cleverstats');
        if (!storedStats) {
            await r.table('vars').insert({
                varname: 'cleverstats',
                stats: {}
            });
            storedStats = {
                stats: {}
            };
        }
        bu.cleverStats[today] = storedStats.stats[today];
        if (!bu.cleverStats[today]) {
            bu.cleverStats[today] = {
                uses: 0
            };
        }
    }
    if (!bu.cleverStats[today]) bu.cleverStats[today] = {
        uses: 0
    };
    bu.cleverStats[today].uses++;

    await r.table('vars').get('cleverstats').update({
        stats: bu.cleverStats
    });
}


function handleAwaitMessage(msg) {
    let channelEvents, userEvents;
    if ((channelEvents = bu.awaitMessages[msg.channel.id]) &&
        (userEvents = channelEvents[msg.author.id]) &&
        Array.isArray(userEvents)) {
        bu.emitter.emit(userEvents[0], msg);
    }
}

function handleTableflip(msg) {
    if (msg.content.indexOf('(╯°□°）╯︵ ┻━┻') > -1 && !msg.author.bot) {
        flipTables(msg, false);
    }
    if (msg.content.indexOf('┬─┬﻿ ノ( ゜-゜ノ)') > -1 && !msg.author.bot) {
        flipTables(msg, true);
    }
}
