const BaseCommand = require('../structures/BaseCommand');
const moment = require('moment-timezone');

class AnnounceCommand extends BaseCommand {
    constructor() {
        super({
            name: 'announce',
            category: bu.CommandType.ADMIN,
            usage: 'announce < <text> | flags >',
            info: 'Makes an annoucement to a configured role, or resets the announcement configuration.',
            flags: [{
                flag: 'r',
                word: 'reset',
                desc: 'Resets the announcement settings'
            }]
        });
    }

    async execute(msg, words, text) {
        let input = bu.parseInput(this.flags, words);
        var changeChannel, roleId;
        let storedGuild = await bu.getGuild(msg.guild.id);
        if (input.r) {
            delete storedGuild.announce;
            await r.table('guild').get(msg.channel.guild.id).replace(storedGuild).run();

            bu.send(msg, 'Announcement configuration reset! Do `b!announce` to reconfigure it.');
            return;
        }
        if (words.length > 1) {

            if (storedGuild.hasOwnProperty('announce')) {
                changeChannel = storedGuild.announce.channel;
                roleId = storedGuild.announce.role;
            } else {

                let msg2 = await bu.awaitQuery(msg,
                    'This guild doesn\'t have announcements set up. Please mention the channel that announcements should be put in.',
                    m => {
                        if (m.channelMentions.length > 0) return true;
                        else return false;
                    });
                changeChannel = msg2.channelMentions[0];
                msg2 = await bu.awaitQuery(msg,
                    'Please type the name or ID of the role to announce to.');
                let role = await bu.getRole(msg, msg2.content);
                if (role != null) {
                    roleId = role.id;
                } else {
                    bu.send(msg, `I couldn't find a role with that name. Run \`b!announce\` to attempt the setup again.`);
                    return;
                }
                await r.table('guild').get(msg.channel.guild.id).update({
                    announce: {
                        channel: changeChannel,
                        role: roleId
                    }
                }).run();
            }
            if (msg.channel.guild.channels.get(changeChannel) == undefined || msg.channel.guild.roles.get(roleId) == undefined) {
                bu.send(msg, `The assigned channel or role has been deleted, the config will be cleaned. Please run the command again.`);
                delete storedGuild.announce;
                await r.table('guild').get(msg.channel.guild.id).update({
                    announce: r.literal({})
                }).run();
                return;
            }
            words.shift();
            var message = words.join(' ');
            let channel = await bu.getChannel(msg, changeChannel, { quiet: true });
            let role = channel.guild.roles.get(roleId);

            let topRole = getTopRole(msg.member);
            let embed = {
                footer: {
                    text: bu.getFullName(msg.author),
                    icon_url: msg.author.avatarURL
                },
                color: topRole ? topRole.color : undefined,
                description: message + '\n',
                timestamp: moment(msg.timestamp),
                author: {
                    name: 'Announcement',
                    icon_url: 'http://i.imgur.com/zcGyun6.png',
                    url: `https://blargbot.xyz/user/${msg.author.id}`
                }
            };
            let roleMention = role.mention;
            let allowedMentions = {
                roles: [role.id]
            };

            if (role.id == msg.channel.guild.id) {
                roleMention = '@everyone';
                allowedMentions = {
                    everyone: true
                };
            }
            message = `**:information_source: Announcement [${moment().format('MM/DD/YYYY')}] ${roleMention} :information_source:**
**${msg.author.username}#${msg.author.discriminator}** has made the following announcement:

${message}`;
            console.debug(message);
            await bu.send(changeChannel, {
                content: roleMention,
                embed: embed,
                allowedMentions
            });
        } else {
            bu.send(msg, 'You have to tell me what to announce!');
        }
    }
}

function getTopRole(member) {
    let role = member.guild.roles.get(member.roles.sort((a, b) => {
        let thing = 0;
        if (member.guild.roles.get(a).color > 0) thing -= 9999999;
        if (member.guild.roles.get(b).color > 0) thing += 9999999;
        thing += member.guild.roles.get(b).position - member.guild.roles.get(a).position;
        return thing;
    })[0]);
    return role;
};

module.exports = AnnounceCommand;
