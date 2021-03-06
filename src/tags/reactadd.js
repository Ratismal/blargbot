/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:51:35
 * @Last Modified by: RagingLink
 * @Last Modified time: 2021-06-13 15:02:54
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.APITag('reactadd')
        .withAlias('addreact')
        .withArgs(a => [
            a.optional([a.optional('channelId'),
            a.require('messageId')]),
            a.require('reactions', true)
        ])
        .withDesc('Adds `reactions` to the given `messageId`. If the `messageId` is not supplied, ' +
            'it instead adds the `reactions` to the output from the containing tag.\n' +
            'Please note that to be able to add a reaction, I must be on the server that you got that reaction from. ' +
            'If I am not, then I will return an error if you are trying to apply the reaction to another message.')
        .withExample(
            '{reactadd;:thinking:;:joy:}',
            '(On message) 🤔(1) 😂(1)'
        )
        .whenArgs(0, Builder.errors.notEnoughArguments)
        .whenDefault(async function (subtag, context, emotes) {
            let channel = null,
                message = null;

            // Check if the first "emote" is actually a valid channel
            channel = await Builder.util.parseChannel(context, emotes[0], { quiet: true, suppress: context.scope.suppressLookup });
            if (!channel) channel = context.channel;
            else emotes.shift();

            // Check that the current first "emote" is a message id
            if (/^\d{17,23}$/.test(emotes[0])) {
                try {
                    message = await bot.getMessage(channel.id, emotes[0]);
                } catch (e) { }
                finally {
                    if (!message) return Builder.errors.noMessageFound(subtag, context);
                    emotes.shift();
                }
            }

            // Find all actual emotes in remaining emotes
            let parsed = bu.findEmoji(emotes.join('|'), true);
            if (parsed.length == 0 && emotes.length > 0)
                return Builder.util.error(subtag, context, 'Invalid Emojis');

            let messageid = message ? message.id : await context.state.outputMessage;
            if (messageid) {
                // Perform add of each reaction
                var errors = await bu.addReactions(channel.id, messageid, parsed);
                if (errors[50013])
                    return Builder.util.error(subtag, context, 'I dont have permission to Add Reactions');
                if (errors[10014])
                    return Builder.util.error(subtag, context, `I cannot add '${errors[10014].reactions}' as reactions`);
            } else {
                // Defer reactions to output message
                context.state.reactions.push(...parsed);
            }
        })
        .build();
