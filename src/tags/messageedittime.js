/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:50:03
 * @Last Modified by: RagingLink
 * @Last Modified time: 2021-06-13 15:02:19
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');
const moment = require('moment-timezone');

module.exports =
    Builder.APITag('messageedittime')
        .withArgs(a => [a.optional([a.optional('channel'), a.require('messageid')]), a.optional('format')])
        .withDesc('Returns the edit time of the given message in the given channel using the given format.' +
            '\n`channel` defaults to the current channel' +
            '\n`messageid` defaults to the executing message id' +
            '\n`format` defaults to `x`')
        .withExample(
            'That was edited at "{messageedittime;DD/MM/YYYY HH:mm:ss}"',
            'That was sent at "10/06/2018 10:07:44"'
        )
        .whenArgs("0-3", async function (subtag, context, args) {
            let channel = context.channel,
                message = context.msg,
                format = "x";

            switch (args.length) {
                case 1:
                    if (/^\d{17,23}$/.test(args[0]))
                        message = await bu.getMessage(channel.id, args[0]);
                    else
                        format = args[0];
                    break;
                case 2:
                    channel = await Builder.util.parseChannel(context, args[0], { quiet: true, suppress: context.scope.suppressLookup });
                    let i = 1;
                    if (!channel) {
                        channel = context.channel;
                        format = args[(i = 0) + 1];
                    }
                    message = await bu.getMessage(channel.id, args[i]);
                    break;
                case 3:
                    channel = await Builder.util.parseChannel(context, args[0], { quiet: true, suppress: context.scope.suppressLookup });
                    if (!channel)
                        return Builder.errors.noChannelFound(subtag, context);
                    message = await bu.getMessage(channel.id, args[1]);
                    format = args[2];
                    break;
            }
            return message ? moment(message.editedTimestamp).format(format) : Builder.errors.noMessageFound(subtag, context);
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();