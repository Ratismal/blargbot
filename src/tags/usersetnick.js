/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:25:36
 * @Last Modified by: stupid cat
 * @Last Modified time: 2019-09-26 09:29:51
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.APITag('usersetnick')
        .withAlias('setnick')
        .withArgs(a => [a.require('nick'), a.optional('user')])
        .withDesc('Sets `user`\'s nickname to `nick`. Leave `nick` blank to reset their nickname.')
        .withExample(
            '{usersetnick;super cool nickname}',
            ''
        )
        .whenArgs(0, Builder.errors.notEnoughArguments)
        .whenArgs('1-2', async function (subtag, context, args) {
            let nick = args[0],
                user = context.user;

            if (args[1])
                user = await context.getUser(args[1], {
                    quiet: false, suppress: context.scope.suppressLookup,
                    label: `${context.isCC ? 'custom command' : 'tag'} \`${context.tagName || 'unknown'}\``
                });

            if (user == null) return Builder.errors.noUserFound(subtag, context);
            else user = context.guild.members.get(user.id);

            try {
                if (user.id === bot.user.id)
                    await bot.editNickname(context.msg.guild.id, nick);
                else {
                    let fullReason = bu.formatAuditReason(context.user, context.scope.reason);
                    await user.edit({
                        nick: nick
                    }, fullReason);
                }
            } catch (err) {
                return Builder.util.error(subtag, context, 'Could not change nickname');
            }
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();