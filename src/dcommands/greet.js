const BaseCommand = require('../structures/BaseCommand'),
    bbEngine = require('../structures/bbtag/Engine');

class GreetCommand extends BaseCommand {
    constructor() {
        super({
            name: 'greet',
            category: bu.CommandType.ADMIN,
            usage: 'greet [message]',
            info: 'Sets a greeting for when users join. To disable it, simply type the command with no content.',
            flags: [{
                flag: 'c',
                word: 'channel',
                desc: 'The channel to put the greeting in.'
            }, {
                flag: 'r',
                word: 'raw',
                desc: 'Gets the code from the currently-set greeting.'
            }]
        });
    }

    async execute(msg, words, text) {
        let input = bu.parseInput(this.flags, words);
        if (input.r) {
            let g = await r.table('guild').get(msg.channel.guild.id);
            let greeting = g.settings.greeting;
            let channel = g.settings.greetchan;
            return await bu.send(msg, `The greeting is set in <#${channel}>.`, { file: greeting, name: 'greeting.bbtag' });
        }

        if (input.undefined.length == 0 && !input.c) {
            bu.guildSettings.remove(msg.channel.guild.id, 'greeting').then(() => {
                bu.send(msg, 'Disabled greetings');
            });
            return;
        }
        var greeting = { content: input.undefined.join(' '), author: msg.author.id, authorizer: msg.author.id };
        await bu.guildSettings.set(msg.channel.guild.id, 'greeting', greeting);
        let suffix = '';
        let channelStr = input.c ? input.c.join(' ') : msg.channel.id;
        if (/[0-9]{17,23}/.test(channelStr)) {
            const channelId = channelStr.match(/([0-9]{17,23})/)[1];
            const channel = await bu.getChannel(msg, channelId, { quiet: true });
            if (!channel) {
                suffix = `A channel could not be found from the channel input, so this message will go into the default channel. `;
            } else if (bot.channelGuildMap[channelId] != msg.guild.id) {
                suffix = `The channel must be on this guild! `;
            } else {
                await bu.guildSettings.set(msg.guild.id, 'greetchan', channelId);
                suffix = `This greeting will be outputted in ${channel.mention}. `;
            }
        }
        await bbEngine.runTag({
            msg,
            limits: new bbtag.limits.ccommand(),
            tagContent: greeting.content,
            input: '',
            isCC: true,
            author: msg.author.id,
            authorizer: msg.author.id,
            outputModify(_, result) { return 'Greeting set. ' + suffix + 'Simulation:\n' + result; }
        });
    }
}

module.exports = GreetCommand;
