/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:25:36
 * @Last Modified by: stupid cat
 * @Last Modified time: 2017-10-18 13:08:52
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.CCommandTag('setnick')
        .requireStaff()
        .withArgs(a => [a.require('nick'), a.optional('user')])
        .withDesc('Sets a user\'s nickname. Leave `nick` blank to reset their nickname.')
        .withExample(
            '{setnick;super cool nickname}',
            ''
        ).beforeExecute(Builder.util.processAllSubtags)
        .whenArgs('1-2', Builder.errors.notEnoughArguments)
        .whenArgs('3', async function (params) {
            let nick = params.args[1],
                user = params.args[2];

            if (user != null)
                user = await bu.getUser(params.msg, user, false);
            else
                user = params.msg.member;

            if (user == null) return await Builder.errors.noUserFound(params);

            try {
                await user.edit({
                    nick: nick
                });
            } catch (err) {
                return await bu.tagProcessError(params, '`Could not change nickname`');
            }
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();