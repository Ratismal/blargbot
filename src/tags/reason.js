/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:50:20
 * @Last Modified by: stupid cat
 * @Last Modified time: 2019-09-28 18:24:24
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.BotTag('reason')
        .withArgs(a => [a.require('reason')])
        .withDesc('Sets the reason for the next API call (ex. roleadd, roleremove, ban, etc.)')
        .withExample(
            '{reason;This will show up in the audit logs!}{roleadd;111111111111}',
            ''
        )
        .whenArgs('0', async function (subtag, context, args) {
            context.scope.reason = undefined;
        })
        .whenArgs('1', async function (subtag, context, args) {
            context.scope.reason = args[0];
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();