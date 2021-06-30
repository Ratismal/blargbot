/*
 * @Author: stupid cat
 * @Date: 2017-05-07 19:31:12
 * @Last Modified by: stupid cat
 * @Last Modified time: 2019-07-29 18:02:34
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */
require('./httpsInterceptor');

global.Promise = require('bluebird');
global.config = require('../../config.json');
const loggr = require('./logger');
const moment = require('moment-timezone');
moment.suppressDeprecationWarnings = true;
const path = require('path');
const fs = require('fs');
const { Client } = require('eris');
const Database = require('./Database');
const { CronJob } = require('cron');
const bbEngine = require('../structures/bbtag/Engine');
const gameSwitcher = require('./gameSwitcher');
const os = require('os');

const https = require('https');
global.bbtag = require('./bbtag.js');
const Sender = require('../structures/Sender');

process.on('unhandledRejection', (err, p) => {
    console.error('Unhandled Promise Rejection: Promise', err);
});

process.on('exit', code => {
    loggr.info('Cluster is exiting with code:', code);
});

process.on('disconnect', () => {
    loggr.info('Cluster has disconnected from IPC.');
});

/** CONFIG STUFF **/
global.bu = require('./util.js');

class DiscordClient extends Client {
    constructor() {
        super(config.discord.token, {
            autoReconnect: true,
            allowedMentions: {
                everyone: false,
                roles: false,
                users: false
            },
            getAllUsers: false,
            disableEvents: {
                TYPING_START: true,
                VOICE_STATE_UPDATE: true
            },
            maxShards: parseInt(process.env.SHARDS_MAX),
            firstShardID: parseInt(process.env.SHARDS_FIRST),
            lastShardID: parseInt(process.env.SHARDS_LAST),
            restMode: true,
            defaultImageFormat: 'png',
            defaultImageSize: 512,
            messageLimit: 5,
            intents: [
                'guilds',
                'guildMembers',
                'guildBans',
                'guildPresences',
                'guildMessages',
                'guildMessageReactions',
                'guildEmojis',
                'directMessages',
                'directmessageReactions'
            ]
        });
        global.bot = this;
        bu.commandMessages = {};
        bu.notCommandMessages = {};

        this.sender = new Sender(this, process);
        console.debug('HELLOOOOO?');
        this.models = {};
        this.database = new Database(this);
        this.database.authenticate();


        bu.init();
        bu.startTime = startTime;

        const Manager = require('./Manager.js');
        global.EventManager = new Manager('events', true);
        global.TagManager = new Manager('tags', undefined, false);
        TagManager.init();
        let tags = Object.keys(TagManager.list).map(k => TagManager.list[k].category);
        console.info('Tags: ' + tags.length +
            ' | Simple: ' + tags.filter(t => t == bu.TagType.SIMPLE).length +
            ' | Complex: ' + tags.filter(t => t == bu.TagType.COMPLEX).length +
            ' | Array: ' + tags.filter(t => t == bu.TagType.ARRAY).length +
            ' | CCommand: ' + tags.filter(t => t == bu.TagType.BOT).length);

        const CommandManagerClass = require('./CommandManager.js');
        global.CommandManager = new CommandManagerClass();

        //website.init();


        console.init('Connecting...');
        this.connect();

        console.addPostHook(({ text, level, timestamp }) => {
            this.sender.send('log', {
                text, level, timestamp
            }).catch(err => {
                // failed to send message to master
            });
        });

        if (process.env.CLUSTER_ID == 0) {
            bu.avatars = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'res', `avatars${config.general.isbeta ? '2' : ''}.json`), 'utf8'));
            this.avatarTask = new CronJob('*/15 * * * *', this.avatarInterval.bind(this));
            this.avatarTask.start();
        }
        this.gameTask = new CronJob('*/15 * * * *', this.gameInterval.bind(this));
        this.gameTask.start();
        this.intervalTask = new CronJob('*/15 * * * *', this.autoresponseInterval.bind(this));
        this.nonce = (Math.floor(Math.random() * 0xffffffff)).toString('16').padStart(8, '0').toUpperCase();

        this.intervalTask.start();

        this.gameInterval();
    }

    async gameInterval() {
        await gameSwitcher();
    }

    async avatarInterval() {
        console.info('!=! Performing the avatar interval !=!');
        if (config.general.isbeta) return;
        let time = moment();
        let h = parseInt(time.format('H'));
        // account for any number of possible avatars
        let m = Math.floor((parseInt(time.format('m')) / 15));
        let c = (h * 4) + m;
        let id = c % bu.avatars.length;
        await this.editSelf({
            avatar: bu.avatars[id]
        });

        // await this.editGuild('194232473931087872', {
        //     icon: bu.avatars[id]
        // });
        // await this.createMessage('492698595447930881', 'Switched avatar to #' + id);
    }

    async autoresponseInterval() {
        let nonce = (Math.floor(Math.random() * 0xffffffff)).toString('16').padStart(8, '0').toUpperCase();
        let timestamp = moment().format('HH:mm:ss');

        let guilds = await r.table('guild').getAll(true, { index: 'interval' });
        guilds = guilds.filter(g => this.guilds.get(g.guildid));
        console.info('[%s] Running intervals on %i guilds', nonce, guilds.length);

        let count = 0;
        let failures = 0;
        const promises = [];
        for (const guild of guilds) {
            if (process.env.CLUSTER_ID == 2) {
                console.info('[%s] Performing interval on %s', nonce, guild.guildid);
            }
            let interval = guild.ccommands._interval;

            try {
                let g = this.guilds.get(guild.guildid);
                let id = interval.authorizer || interval.author;
                let m = g.members.get(id);
                if (!m) {
                    // member does not exist, skip execution
                    // TODO: some sort of notification that the authorizer is no longer around
                    continue;
                }
                let u = this.users.get(id);
                if (!u) u = await this.getRESTUser(id);
                let c;
                for (const channel of g.channels.values()) {
                    if (channel.type === 0) { c = channel; break; }
                }

                let promise = bbEngine.runTag({
                    msg: {
                        channel: c,
                        author: u,
                        member: m,
                        guild: g
                    },
                    limits: new bbtag.limits.autoresponse_everything(),
                    tagContent: interval.content,
                    input: '',
                    isCC: true,
                    tagName: '_interval',
                    author: interval.author,
                    authorizer: interval.authorizer,
                    silent: true
                }).then(() => {
                    count++;
                }).catch(err => {
                    console.error('Issue with interval:', guild.guildid, err);
                    failures++;
                });

                promises.push(Promise.race([promise, new Promise(res => {
                    setTimeout(() => res(guild.guildid), 10000);
                })]));
            } catch (err) {
                console.error('Issue with interval:', guild.guildid, err);
                failures++;
            }
        }

        const resolutions = await Promise.all(promises);
        console.log(resolutions);

        let unresolved = resolutions.filter(r => !!r);

        console.info('[%s] Intervals complete. %i success | %i fail | %i unresolved', nonce, count, failures, unresolved.length);
        if (unresolved.length > 0) {
            console.info('[%s] Unresolved in:\n%s', nonce, unresolved.map(m => '- ' + m).join('\n'));
        }
    }

    async eval(msg, text, send = true) {
        if (msg.author.id === bu.CAT_ID) {
            let resultString, result;
            var commandToProcess = text.replace('eval ', '');
            if (commandToProcess.startsWith('```js') && commandToProcess.endsWith('```'))
                commandToProcess = commandToProcess.substring(6, commandToProcess.length - 3);
            else if (commandToProcess.startsWith('```') && commandToProcess.endsWith('```'))
                commandToProcess = commandToProcess.substring(4, commandToProcess.length - 3);
            try {
                let func;
                if (commandToProcess.split('\n').length === 1) {
                    func = eval(`async () => ${commandToProcess}`);
                } else {
                    func = eval(`async () => { ${commandToProcess} }`);
                }
                func.bind(this);
                let res = await func();
                result = res;
                resultString = `Input:
\`\`\`js
${commandToProcess}
\`\`\`
Output:
\`\`\`js
${res}
\`\`\``;
            } catch (err) {
                result = err;
                resultString = `An error occured!
\`\`\`js
${err.stack}
\`\`\``;
            }
            if (send)
                bu.send(msg, resultString);
            else return { resultString, result };
        }
    }
}

var startTime = moment();

function filterUrls(input) {
    return input.replace(/https?\:\/\/.+\.[a-z]{1,20}(\/[^\s]*)?/gi, '');
}

var discord = new DiscordClient();
discord.sender.send('threadReady', process.env.CLUSTER_ID);

process.on('message', async msg => {
    const { data, code } = JSON.parse(msg);

    if (code.startsWith('await:')) {
        bot.sender.emit(code, data);
    }

    switch (code) {
        case 'await':
            const eventKey = 'await:' + data.key;
            switch (data.message) {
                case 'metrics': {
                    bu.Metrics.userGauge.set(bot.users.size);
                    bot.sender.send(eventKey, JSON.stringify(bu.Metrics.aggregated.getMetricsAsJSON()));
                    break;
                }
                case 'lookupChannel': {
                    let chan = bot.getChannel(data.id);
                    if (chan) {
                        bot.sender.send(eventKey, JSON.stringify({ channel: chan.name, guild: chan.guild.name }));
                    } else bot.sender.send(eventKey, "null");
                    break;
                }
                case 'eval': {
                    let result = await discord.eval({ author: { id: bu.CAT_ID } }, data.code, false);
                    bot.sender.send(eventKey, { result: result.result, shard: parseInt(process.env.CLUSTER_ID) });
                    break;
                }
                case 'retrieveUser':
                    bot.sender.send(eventKey, { user: bot.users.get(data.id) });
                    break;
                case 'getStaffGuilds': {
                    let { user, guilds } = data;
                    let res = [];
                    for (const g of guilds) {
                        if (bot.guilds.get(g.id)) {
                            if (await bu.isUserStaff(user, g.id))
                                res.push(g);
                        }
                    }
                    bot.sender.send(eventKey, JSON.stringify(res));
                    break;
                }
                case 'tagList': {
                    let tags = {};
                    let ls = TagManager.list;
                    for (const key in ls) {
                        if (ls[key].isTag) {
                            let t = ls[key];
                            tags[key] = {
                                key,
                                category: t.category,
                                name: t.name,
                                args: t.args,
                                usage: t.usage,
                                desc: t.desc,
                                exampleCode: t.exampleCode,
                                exampleIn: t.exampleIn,
                                exampleOut: t.exampleOut,
                                deprecated: t.deprecated,
                                returns: t.returns,
                                errors: t.errors,
                                staff: t.staff,
                                aliases: t.aliases
                            };
                        }
                    }
                    bot.sender.send(eventKey, JSON.stringify(tags));
                    break;
                }
                case 'commandList': {
                    let commands = {};
                    let ls = CommandManager.built;
                    for (const key in ls) {
                        let c = ls[key];
                        if (c.isCommand && !c.hidden) {
                            commands[key] = {
                                key,
                                name: c.name,
                                usage: c.usage,
                                info: c.info,
                                longinfo: c.longinfo,
                                category: c.category,
                                aliases: c.aliases,
                                flags: c.flags,
                                onlyOn: c.onlyOn
                            };
                        }
                    }
                    bot.sender.send(eventKey, JSON.stringify(commands));
                    break;
                }
            }
            break;
        case 'discordMessage':
            let { message, attachment } = data;
            if (attachment)
                await bu.send(config.discord.channel, message, attachment);
            else
                await bu.send(config.discord.channel, message);
            break;
        case 'discordTopic':
            let { topic } = data;
            await bot.editChannel(config.discord.channel, {
                topic: topic
            });
            break;
        case 'killShard':
            let { id, reconnect } = data;
            console.shardi('Killing shard', id, (reconnect ? 'with' : 'without'), 'a reconnect.');
            let shard = bot.shards.find(s => s.id === id);
            if (shard)
                shard.disconnect({
                    reconnect: !!reconnect
                });
    }
});

let lastTotalCpuTime;
let lastUserCpuTime;
let lastSystemCpuTime;
function getTotalCpuTime() {
  const cpus = os.cpus();
  return cpus.reduce((acc, cur) => acc + (cur.times.user + cur.times.nice + cur.times.sys + cur.times.idle + cur.times.irq), 0) / cpus.length;
}

function getCPU() {
    const totalCpuTime = getTotalCpuTime();
    const cpuUsage = process.cpuUsage();
    const userTime = cpuUsage.user / 1000;
    const systemTime = cpuUsage.system / 1000;

    const totalDiff = totalCpuTime - (lastTotalCpuTime || 0);
    const userDiff = userTime - (lastUserCpuTime || 0);
    const systemDiff = systemTime - (lastSystemCpuTime || 0);
    lastTotalCpuTime = totalCpuTime;
    lastUserCpuTime = userTime;
    lastSystemCpuTime = systemTime;

    return {
        userCpu: userDiff / totalDiff * 100,
        systemCpu: systemDiff / totalDiff * 100
    };
}

/** @type {{[key: string]: number | undefined}} */
var lastReady = {};

/**
 * @returns {number | undefined}
 * @param {string} shard
 */
function getLastReady(shard) {
    if (shard.status == 'ready')
        return lastReady[shard.id] = Date.now();

    return lastReady[shard.id];
}

// shard status posting
let shardStatusInterval = setInterval(async () => {
    let mem = process.memoryUsage();
    let clusterId = parseInt(process.env.CLUSTER_ID);
    bot.sender.send('shardStats', {
        id: clusterId,
        time: Date.now(),
        readyTime: bu.startTime.valueOf(),
        guilds: bot.guilds.size,
        rss: mem.rss,
        ...getCPU(),
        shardCount: parseInt(process.env.SHARDS_COUNT),
        shards: bot.shards.map(s => ({
            id: s.id,
            status: s.status,
            latency: s.latency,
            guilds: bot.guilds.filter(g => g.shard.id === s.id).length,
            cluster: clusterId,
            time: getLastReady(s)
        }))
    });
}, 10000);


// Now look at this net,
// that I just found!
async function net() {
    // When I say go, be ready to throw!

    // GO!
    throw net();
}
// Urgh, let's try something else!
