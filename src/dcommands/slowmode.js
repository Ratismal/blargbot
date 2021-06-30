const BaseCommand = require('../structures/BaseCommand');

class SlowmodeCommand extends BaseCommand {
    constructor() {
        super({
            name: 'slowmode',
            category: bu.CommandType.ADMIN,
            usage: 'slowmode [time]',
            info: 'Sets the channel\'s slowmode to 1 message every `time` seconds, with a max of 120. Leave empty to disable slowmode.',
            flags: [{ flag: 'c', word: 'channel', desc: 'The channel to put under slowmode' },
            { flag: 'r', word: 'reason', desc: 'The reason for the slowmode' }]
        });
    }

    async execute(msg, words, text) {
        let input = bu.parseInput(this.flags, words);


        let time = parseInt(input.undefined[0]);
        if (isNaN(time)) time = 0;

        time = Math.min(time, 120);

        let channel = msg.channel;
        if (input.c && /(\d+)/.test(input.c[0])) {
            let c = input.c[0].match(/(\d+)/)[1];
            let guild = bot.channelGuildMap[channel];
            if (guild == msg.guild.id) channel = c;
        }

        try {
            await channel.edit({
                rateLimitPerUser: time,
                reason: encodeURIComponent(`[${bu.getFullName(msg.author)}] ${input.r ? input.r.join(' ') : ''}`)
            });

            let out = ':ok_hand: ';
            if (time === 0) out += 'Slowmode has been disabled.';
            else out += `Slowmode has been set to 1 message every **${time} seconds**.`;
            return await bu.send(msg, out);
        } catch (err) {
            return await bu.send(msg, 'I wasn\'t able to manage slowmode.');
        }
    }
}

module.exports = SlowmodeCommand;
