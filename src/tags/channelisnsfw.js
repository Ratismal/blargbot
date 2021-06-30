/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:50:20
 * @Last Modified by: RagingLink
 * @Last Modified time: 2021-06-19 17:49:41
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.APITag('channelisnsfw')
        .withAlias('isnsfw')
        .withArgs(a => [a.optional('channelId'), a.optional('quiet')])
        .withDesc('Checks if `channelId` is a NSFW channel. `channelId` defaults to the current channel')
        .withExample(
            '{if;{isnsfw};Spooky nsfw stuff;fluffy bunnies}',
            'fluffy bunnies'
        )
        .whenArgs(0, (_, context) => context.channel.nsfw)
        .whenArgs('1-2', async function (subtag, context, args) {
            let quiet = bu.isBoolean(context.scope.quiet) ? context.scope.quiet : !!args[1];
            let channel = await Builder.util.parseChannel(context, args[0], { quiet, suppress: context.scope.suppressLookup });

            if (!channel)
                return quiet ? false : Builder.errors.noChannelFound(subtag, context);

            return channel.nsfw;
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();
