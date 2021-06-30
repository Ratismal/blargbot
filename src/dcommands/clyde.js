const BaseCommand = require('../structures/BaseCommand');

class ClydeCommand extends BaseCommand {
    constructor() {
        super({
            name: 'clyde',
            category: bu.CommandType.IMAGE,
            usage: 'clyde <text>',
            info: 'Give everyone a message from Clyde.',
            userRatelimit: true,
            channelRatelimit: true,
            cooldown: 5000
        });
    }

    async execute(msg, words) {
        if (words.length == 1) {
            bu.send(msg, 'Not enough arguments!'); return;
        }
        let text = await bu.filterMentions(words.slice(1).join(' '));
        bot.sendChannelTyping(msg.channel.id);
        let code = bu.genEventCode();
        let buffer = await bu.awaitEvent({
            cmd: 'img',
            command: 'clyde',
            code: code,
            text
        });
        await bu.send(msg, undefined, {
            file: buffer,
            name: 'clyde.png'
        });
    }
}

module.exports = ClydeCommand;
