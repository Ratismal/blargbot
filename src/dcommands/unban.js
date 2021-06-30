const BaseCommand = require('../structures/BaseCommand');
const moment = require('moment-timezone');

class UnbanCommand extends BaseCommand {
    constructor() {
        super({
            name: 'unban',
            category: bu.CommandType.ADMIN,
            usage: 'unban <userid> [flags]',
            info: 'Unbans a user.\nIf mod-logging is enabled, the unban will be logged.',
            flags: [{ flag: 'r', word: 'reason', desc: 'The reason for the unban.' }]
        });
    }

    async execute(msg, words, text) {
        let input = bu.parseInput(this.flags, words);
        if (input.undefined.length > 0) {
            var user = input.undefined.join(' ').match(/(\d+)/)[1];
            if (!user) {
                bu.send(msg, `I couldn't find that user. Please make sure you're giving me a user id or a mention.`);
                return;
            }
            let response = await this.unban(msg, user, input.r);
            bu.send(msg, response[0]);
        }
    }

    async unban(msg, user, reason, tag = false, noPerms = false) {
        if (msg.channel.guild.members.get(bot.user.id).permissions.json.banMembers) {
            let banPerms = await bu.guildSettings.get(msg.guild.id, 'banoverride') || 0;
            if (noPerms || (bu.comparePerms(msg.member, banPerms) || msg.member.permissions.json.banMembers)) {
                if (typeof user === 'object') user = user.id;
                if (!bu.unbans[msg.channel.guild.id])
                    bu.unbans[msg.channel.guild.id] = {};
                if (reason && Array.isArray(reason)) reason = reason.join(' ');

                bu.unbans[msg.channel.guild.id][user] = {
                    mod: noPerms ? bot.user : msg.author,
                    type: tag ? 'Tag Unban' : 'Unban',
                    reason: reason
                };

                try {
                    const fullReason = encodeURIComponent((tag ? '' : `[ ${bu.getFullName(msg.author)} ]`) + (reason ? ' ' + reason : ''));
                    await bot.unbanGuildMember(msg.channel.guild.id, user, fullReason);
                    return [':ok_hand:', true];
                } catch (err) {
                    return [`Failed to unban the user! Please check your permission settings and command and retry. \nIf you still can't get it to work, please report it to me by doing \`b!report <your issue>\` with the following:\`\`\`\n${err.message}\n${err.response}\`\`\``, false];
                }
            } else {
                return [`You don't have permission to unban users!`, '`User has no permissions`'];
            }
        } else {
            return [`I don't have permission to unban users!`, '`Bot has no permissions`'];
        }
    }

    async event(args) {
        if (!bu.unbans[args.guild]) bu.unbans[args.guild] = {};
        bu.unbans[args.guild][args.user] = {
            mod: bot.user.id,
            reason: `Automatically unbanned after ${moment.duration(args.duration).humanize()}.`
        };
        await bot.unbanGuildMember(args.guild, args.user, 'Automatic unban after time');
    }

}

module.exports = UnbanCommand;
