const BaseCommand = require('../structures/BaseCommand');
const moment = require('moment-timezone');

class BanCommand extends BaseCommand {
    constructor() {
        super({
            name: 'ban',
            category: bu.CommandType.ADMIN,
            usage: 'ban <user> [days] [flags]',
            info: 'Bans a user, where `days` is the number of days to delete messages for (defaults to 1).\nIf mod-logging is enabled, the ban will be logged.',
            flags: [{ flag: 'r', word: 'reason', desc: 'The reason for the ban.' },
            {
                flag: 't',
                word: 'time',
                desc: 'If provided, the user will be unbanned after the period of time. (softban)'
            }]
        });
    }

    async execute(msg, words, text) {
        if (words[1]) {
            let input = bu.parseInput(this.flags, words);

            var user = await bu.getUser(msg, input.undefined[0]);
            if (!user) {
                return await bu.send(msg, `I couldn't find that user. Try again with their ID or a mention instead.`);
                // bu.send(msg, `I couldn't find that user. Try using \`hackban\` with their ID or a mention instead.`);
                // return;
            }
            // let member = msg.guild.members.get(user.id);
            // if (!member) {
            //     bu.send(msg, `That user isn't on this guild. Try using \`hackban\` with their ID or a mention instead.`);
            //     return;
            // }
            let duration;
            if (input.t && input.t.length > 0) {
                duration = bu.parseDuration(input.t.join(' '));
            }
            bu.send(msg, (await this.ban(msg, user, parseInt(input.undefined.length > 1 ? input.undefined[input.undefined.length - 1] : 0), input.r, duration))[0]);
        } else bu.send(msg, 'You have to tell me who to ban!');
    }

    async ban(msg, user, deleteDays = 1, reason, duration, tag = false, noPerms = false) {
        if (!msg.channel.guild.members.get(bot.user.id).permissions.json.banMembers) {
            return [`I don't have permission to ban users!`, '`Bot has no permissions`'];
        }
        let banPerms = await bu.guildSettings.get(msg.guild.id, 'banoverride') || 0;
        if (!noPerms && (!bu.comparePerms(msg.member, banPerms) && !msg.member.permissions.json.banMembers)) {
            return [`You don't have permission to ban users!`, '`User has no permissions`'];
        }

        let member = msg.guild.members.get(user.id);

        if (member) {
            var botPos = bu.getPosition(msg.channel.guild.members.get(bot.user.id));
            var userPos = bu.getPosition(msg.member);
            var targetPos = bu.getPosition(msg.channel.guild.members.get(user.id));
            if (targetPos >= botPos) {
                return [`I don't have permission to ban ${user.username}!`, '`Bot has no permissions`'];
            }
            if (!noPerms && targetPos >= userPos && msg.author.id != msg.guild.ownerID) {
                return [`You don't have permission to ban ${user.username}!`, '`User has no permissions`'];
            }
        }
        if (!bu.bans[msg.channel.guild.id])
            bu.bans[msg.channel.guild.id] = {};
        if (reason && Array.isArray(reason)) reason = reason.join(' ');

        bu.bans[msg.channel.guild.id][user.id] = {
            mod: noPerms ? bot.user : msg.author,
            type: tag ? 'Tag Ban' : 'Ban',
            reason: reason
        };
        try {
            const fullReason = (tag ? '' : `[ ${bu.getFullName(msg.author)} ]`) + (reason ? ' ' + reason : '');
            await bot.banGuildMember(msg.channel.guild.id, user.id, deleteDays, encodeURIComponent(fullReason));
            let suffix = '';
            if (duration) {
                await bu.events.insert({
                    type: 'unban',
                    source: msg.guild.id,
                    user: user.id,
                    content: `${user.username}#${user.discriminator}`,
                    guild: msg.guild.id,
                    duration: duration.toJSON(),
                    endtime: r.epochTime(moment().add(duration).unix()),
                    starttime: r.epochTime(moment().unix())
                });
                return [`:ok_hand: The user will be unbanned ${duration.humanize(true)}.`, duration.asMilliseconds()];
            } else {
                return [`:ok_hand:`, true];
            }
        } catch (err) {
            return [`Failed to ban the user! Please check your permission settings and command and retry. \nIf you still can't get it to work, please report it to me by doing \`b!report <your issue>\` with the following:\`\`\`\n${err.message}\n${err.response}\`\`\``, false];
        }
    }
}

module.exports = BanCommand;
