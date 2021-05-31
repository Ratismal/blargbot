/*
 * @Author: RagingLink
 * @Date: 2021-28-01 11:37:28
 * @Last Modified by: RagingLink
 * @Last Modified time: 2021-28-01 11:37:28
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.BotTag('flagsarray')
        .withDesc('Returns an array of all flags provided.')
        .withExample(
            '{flagsarray}',
            'Hello -dc world',
            '["_","d","c"]'
        )
        .whenArgs(0, async function(_, context, __) {
            return Object.keys(context.flaggedInput).filter(key => context.flaggedInput[key] !== undefined);
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();
