/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:22:21
 * @Last Modified by: stupid cat
 * @Last Modified time: 2018-12-30 20:47:33
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const bbEngine = require('../structures/bbtag/Engine');

bot.on('guildMemberRemove', async function (guild, member) {
    const now = Date.now();
    let val = await bu.guildSettings.get(guild.id, 'farewell');
    let chan = await bu.guildSettings.get(guild.id, 'farewellchan');
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
            tagName: 'farewell',
            author,
            authorizer
        });
    }
    bu.logEvent(guild.id, member.user.id, 'memberleave', [{
        name: 'User',
        value: bu.getFullName(member.user) + ` (${member.user.id}) | <@${member.user.id}>`,
        inline: true
    }]);

    let e = await bu.getAudit(guild.id, member.user.id, 20);
    if (e && now - bu.unmakeSnowflake(e.id) <= 1000) {
        let mod = bot.users.get(e.user.id);
        bu.logAction(
            guild,
            member,
            mod,
            'Kick',
            e.reason,
            bu.ModLogColour.KICK);
    }
});
