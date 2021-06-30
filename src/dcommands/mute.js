const BaseCommand = require('../structures/BaseCommand');
const moment = require('moment-timezone');

class MuteCommand extends BaseCommand {
    constructor() {
        super({
            name: 'mute',
            category: bu.CommandType.ADMIN,
            usage: 'mute <user> [flags]',
            info: 'Gives the user a special muted role. On first run, this role will be created. The bot needs to be able to `manage roles` to create and assign the role, and `manage channels` to configure the role. You are able to manually configure the role without the bot, but the bot has to make it. Deleting the muted role causes it to be regenerated.\nIf the bot has permissions for it, this command will also voice-mute the user.\nIf mod-logging is enabled, the mute will be logged.\nYou can also specify a length of time the user should be muted for, using formats such as `1 hour 2 minutes` or `1h2m`.',
            flags: [{ flag: 'r', word: 'reason', desc: 'The reason for the mute.' },
            {
                flag: 't',
                word: 'time',
                desc: 'The amount of time to mute for, formatted as \'1 day 2 hours 3 minutes and 4 seconds\', \'1d2h3m4s\', or some other combination.'
            }]
        });
    }

    async execute(msg, words, text) {
        let mutedrole = await bu.guildSettings.get(msg.channel.guild.id, 'mutedrole');

        if (!mutedrole) {
            if (msg.channel.guild.members.get(bot.user.id).permissions.json.manageRoles) {
                let role = await bot.createRole(msg.channel.guild.id, {
                    color: 16711680,
                    name: 'Muted',
                    permissions: 0,
                    reason: 'Automatic muted role generation'
                });
                await bu.guildSettings.set(msg.channel.guild.id, 'mutedrole', role.id);
                if (msg.channel.guild.members.get(bot.user.id).permissions.json.manageChannels) {
                    var channels = msg.channel.guild.channels.map(m => m);
                    console.debug(channels.length);
                    for (var i = 0; i < channels.length; i++) {
                        bot.editChannelPermission(channels[i].id, role.id, 0, 2048, 'role', 'Automatic muted role configuration').catch(logError);
                    }
                    this.execute(msg, words, text);
                } else {
                    bu.send(msg, `I created a \`muted\` role, but don't have permissions to configure it! Either configure it yourself, or make sure I have the \`manage channel\` permission, delete the \`muted\` role, and try again.`);
                }
            } else {
                bu.send(msg, `I don't have enough permissions to create a \`muted\` role! Make sure I have the \`manage roles\` permission and try again.`);
            }
            return;
        } else {
            if (!msg.channel.guild.roles.get(mutedrole)) {
                await bu.send(msg, `Couldn't find the muted role! Attempting to regenerate it...`);
                await bu.guildSettings.remove(msg.channel.guild.id, 'mutedrole');
                await this.execute(msg, words, text);
                return;
            }
        }
        if (words.length > 1) {
            if (msg.channel.guild.members.get(bot.user.id).permissions.json.manageRoles) {
                let role = msg.guild.roles.get(mutedrole);
                //        if (msg.member.permissions.json.manageRoles) {
                if (words[1]) {
                    var user = await bu.getUser(msg, words[1]);
                    if (!user) {
                        await bu.send(msg, `I couldn't find that user!`);
                        return;
                    }
                    var member = msg.channel.guild.members.get(user.id);
                    if (!member) {
                        await bu.send(msg, `I couldn't find that user!`);
                        return;
                    }
                    var botPos = bu.getPosition(msg.channel.guild.members.get(bot.user.id));
                    console.debug(role.position, botPos);
                    if (role.position >= botPos) {
                        await bu.send(msg, `I can't assign the muted role! (it's higher than or equal to my top role)`);
                        return;
                    }
                    let voiceMute = msg.guild.members.get(bot.user.id).permissions.json.voiceMuteMembers;
                    /*
                    var userPos = bu.getPosition(msg.member);
                    var targetPos = role.position;
                    if (targetPos >= botPos) {
                        bu.send(msg, `I don't have permission to assign the muted role!\nError: target is higher than me in the role heirarchy.`);
                        return;
                    }
                    if (targetPos >= userPos) {
                        bu.send(msg, `You don't have permission to assign the muted role!\nError: target is higher than you in the role heirarchy.`);
                        return;
                    }
                    */
                    if (member.roles.indexOf(mutedrole) > -1) {
                        bu.send(msg, 'That user is already muted!');
                    } else {
                        try {
                            let reason, fullReason;
                            let input = bu.parseInput(this.flags, words);
                            if (input.r) {
                                reason = input.r.join(' ');
                                fullReason = `[ ${bu.getFullName(msg.author)} ] ${reason || ''}`;
                            }
                            await bot.addGuildMemberRole(msg.channel.guild.id, user.id, mutedrole, encodeURIComponent(fullReason));

                            // discord started erroring on voiceMute if the user wasn't in a voice channel (thanks, discord!)
                            // so, now we gotta make two calls i guess
                            // TODO: check if user is in a voice channel
                            if (voiceMute) {
                                try {
                                    await bot.editGuildMember(msg.channel.guild.id, user.id, {
                                        mute: true
                                    }, encodeURIComponent(fullReason));
                                } catch (err) { /* no-op */ }
                            }

                            bu.logAction(msg.channel.guild, user, msg.author, 'Mute', reason, bu.ModLogColour.MUTE);
                            let suffix = '';
                            if (input.t) {
                                let duration = bu.parseDuration(input.t.join(' '));
                                if (duration.asMilliseconds() > 0) {
                                    await bu.events.insert({
                                        type: 'unmute',
                                        source: msg.guild.id,
                                        user: user.id,
                                        content: `${user.username}#${user.discriminator}`,
                                        guild: msg.guild.id,
                                        duration: duration.toJSON(),
                                        role: mutedrole,
                                        endtime: r.epochTime(moment().add(duration).unix()),
                                        starttime: r.epochTime(moment().unix())
                                    });
                                    suffix = `The user will be unmuted ${duration.humanize(true)}.`;
                                } else {
                                    suffix = `The user was muted, but the duration was either 0 seconds or improperly formatted so they won't automatically be unmuted.`;
                                }
                            }
                            bu.send(msg, ':ok_hand: ' + suffix);
                        } catch (err) {
                            bu.send(msg, `Failed to assign the muted role! Please check your permission settings and command and retry.\n If you still can't get it to work, please report it to me by doing \`b!report <your issue>\` with the following:\`\`\`\n${err.message}\n${err.response}\`\`\``);
                            throw err;
                        }
                    }
                }
            } else {
                bu.send(msg, `I don't have permission to mute users! Make sure I have the \`manage roles\` permission and try again.`);
            }
        }
    }
}

function logError(err) {
    console.error(err);
}

module.exports = MuteCommand;
