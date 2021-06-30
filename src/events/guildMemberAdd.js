/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:21:55
 * @Last Modified by: stupid cat
 * @Last Modified time: 2018-02-08 13:16:04
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */
const bbEngine = require('../structures/bbtag/Engine');
const moment = require('moment-timezone');

bot.on('guildMemberAdd', async function (guild, member) {
    await bu.processUser(member.user);
    let val = await bu.guildSettings.get(guild.id, 'greeting');
    let chan = await bu.guildSettings.get(guild.id, 'greetchan');
    let channel;
    if (chan && val) {
        channel = bot.getChannel(chan);
    }
    if (channel) {
        let ccommandContent;
        let author, authorizer;
        if (typeof val == "object") {
            ccommandContent = val.content;
            author = val.author;
            authorizer = val.authorizer;
        } else {
            ccommandContent = val;
        }
        await bbEngine.runTag({
            msg: {
                channel: channel,
                author: member.user,
                member: member,
                guild: guild
            },
            limits: new bbtag.limits.ccommand(),
            tagContent: ccommandContent,
            input: '',
            isCC: true,
            tagName: 'greet',
            author,
            authorizer
        });
    }
    bu.logEvent(guild.id, member.user.id, 'memberjoin', [{
        name: 'User',
        value: bu.getFullName(member.user) + ` (${member.user.id}) | <@${member.user.id}>\nMember #${guild.memberCount}`,
        inline: true
    }, {
        name: 'Created',
        value: moment(member.user.createdAt).tz('Etc/GMT').format('llll') +
            ` GMT\n(${moment.duration(-1 * (moment() - moment(member.user.createdAt))).humanize(true)})`,
        inline: false
    }]);
});