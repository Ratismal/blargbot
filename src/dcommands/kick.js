const BaseCommand = require('../structures/BaseCommand');

class KickCommand extends BaseCommand {
    constructor() {
        super({
            name: 'kick',
            category: bu.CommandType.ADMIN,
            usage: 'kick <user> [flags]',
            info: 'Kicks a user.\nIf mod-logging is enabled, the kick will be logged.',
            flags: [{ flag: 'r', word: 'reason', desc: 'The reason for the kick.' }]
        });
    }

    async execute(msg, words, text) {
        if (!words[1]) {
            bu.send(msg, `You didn't tell me who to kick!`);
            return;
        }

        let target = await bu.getUser(msg, words[1]);
        let reason = bu.parseInput(this.flags, words).r;

        if (!target) return;

        let state = await this.kick(msg, target, reason, false, false);
        let response;
        switch (state) {
            case 0: //Successful
                response = `:ok_hand:`;
                break;
            case 1: //Bot doesnt have perms
                response = `I don't have permission to kick users!`;
                break;
            case 2: //Bot cannot kick target
                response = `I don't have permission to kick ${target.username}!`;
                break;
            case 3: //User doesnt have perms
                response = `You don't have permission to kick users!`;
                break;
            case 4: //User cannot kick target
                response = `You don't have permission to kick ${target.username}!`;
                break;
            default: //Error occurred
                response = `Failed to kick the user! Please check your permission settings and command and retry. \nIf you still can't get it to work, please report it to me by doing \`b!report <your issue>\` with the following:\`\`\`\n${state.message}\n${state.response}\`\`\``;
                break;
        }

        bu.send(msg, response);
    }

    async kick(msg, target, reason, tag = false, noPerms = false) {
        if (!msg.channel.guild.members.get(bot.user.id).permissions.json.kickMembers)
            return 1;
        let kickPerms = await bu.guildSettings.get(msg.guild.id, 'kickoverride') || 0;
        if (!noPerms && !bu.comparePerms(msg.member, kickPerms) && !msg.member.permissions.json.kickMembers)
            return 3;

        var botPos = bu.getPosition(msg.channel.guild.members.get(bot.user.id));
        var userPos = bu.getPosition(msg.member);
        var targetPos = bu.getPosition(msg.channel.guild.members.get(target.id));
        if (targetPos >= botPos)
            return 2;
        if (!noPerms && targetPos >= userPos && msg.author.id != msg.guild.ownerID)
            return 4;

        try {
            const fullReason = encodeURIComponent((tag ? '' : `[ ${bu.getFullName(msg.author)} ]`)
                + (reason ? ' ' + (Array.isArray(reason) ? reason.join(' ') : reason) : ''));

            await bot.kickGuildMember(
                msg.channel.guild.id,
                target.id,
                fullReason
            );

            return 0;
        }
        catch (err) {
            console.error(err);
            return err;
        }
    }
}

module.exports = KickCommand;
