/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:50:03
 * @Last Modified by: RagingLink
 * @Last Modified time: 2021-06-13 15:02:37
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.APITag('messagetext')
        .withAlias('text')
        .withArgs(a => a.optional([a.optional('channel'), a.require('messageid')]))
        .withDesc('Returns the text of the given message in the given channel.' +
            '\n`channel` defaults to the current channel' +
            '\n`messageid` defaults to the executing message id')
        .withExample(
            'You sent "{messagetext}"',
            'You sent "Spooky message"'
        )
        .whenArgs(0, async (_, context) => context.msg.content)
        .whenArgs(1, async function (subtag, context, args) {
            return this.getMessageContent(subtag, context, context.channel.id, args[0]);
        })
        .whenArgs(2, async function (subtag, context, args) {
            let channel = await Builder.util.parseChannel(context, args[0], { quiet: true, suppress: context.scope.suppressLookup });
            if (!channel)
                return Builder.errors.noChannelFound(subtag, context);
            return this.getMessageContent(subtag, context, channel.id, args[1]);
        })
        .withProp("getMessageContent", async function (subtag, context, channelId, messageId) {
            const message = await bu.getMessage(channelId, messageId);
            return message
                ? message.content
                : Builder.errors.noMessageFound(subtag, context);
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();