/*
 * @Author: stupid cat
 * @Date: 2017-05-07 19:20:29
 * @Last Modified by: stupid cat
 * @Last Modified time: 2017-05-07 19:20:29
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.ComplexTag('userjoinedat')
        .withArgs(a => [a.optional('format'), a.optional('user'), a.optional('quiet')])
        .withDesc('Returns the date the user joined the current guild, in UTC+0. ' +
            'If a `format` code is specified, the date is formatted accordingly. ' +
            'Leave blank for default formatting. ' +
            'See the <a href=\'http://momentjs.com/docs/#/displaying/format/\'>moment documentation</a> for more information. ' +
            'If `user` is specified, gets that user instead. ' +
            'If `quiet` is specified, if a user can\'t be found it will simply return the `user`')
        .withExample(
            'Your account joined this guild on {usercreatedat;YYYY/MM/DD HH:mm:ss}',
            'Your account joined this guild on 2016/01/01 01:00:00.'
        ).beforeExecute(Builder.util.processAllSubtags)
        .whenArgs('1-4', async function (params) {
            let user = await bu.getTagUser(params.msg, params.args, 2);

            if (user != null) {
                let member = params.msg.channel.guild.members.get(user.id);
                if (member != null)
                    return dep.moment(member.joinedAt).format(params.args[1] || '');
                return await Builder.errors.userNotInGuild(params);
            }

            if (params.args[3])
                return params.args[2];
            return '';
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();