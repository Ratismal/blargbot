/*
 * @Author: zoomah
 * @Date: 2018-07-10 7:08:15
 * @Last Modified by: RagingLink
 * @Last Modified time: 2021-06-19 17:49:53
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.APITag('channelisvoice')
        .withAlias('isvoice')
        .withArgs(a => [a.optional('channelId'), a.optional('quiet')])
        .withDesc('Checks if `channelId` is a voice channel. `channelId` defaults to the current channel')
        .withExample(
            '{if;{istext,123456789};yup;nope}',
            'nope'
        )
        .whenArgs(0, (_, context) => context.channel.type == 2)
        .whenArgs('1-2', async function (subtag, context, args) {
            let quiet = bu.isBoolean(context.scope.quiet) ? context.scope.quiet : !!args[1];
            let channel = await Builder.util.parseChannel(context, args[0], { quiet, suppress: context.scope.suppressLookup });

            if (!channel)
                return quiet ? false : Builder.errors.noChannelFound(subtag, context);

            return channel.type == 2;
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();
