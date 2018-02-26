/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:26:17
 * @Last Modified by: stupid cat
 * @Last Modified time: 2017-05-21 00:49:16
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.ComplexTag('args')
        .withArgs(b =>
            b.optional('index').optional('range')
        ).withDesc('Gets user input. Specifying an index will only get the word at that location, specifying' +
            'a range will get all the words between index and range. Specify range as `n` to get all' +
            'the words from index to the end'
        ).withExample(
            'Your second word was {args;1}',
            'Hello world!',
            'Your second word was world!'
        ).beforeExecute(Builder.defaults.processAllSubtags)
        .whenArgs('1', async params => params.words.join(' '))
        .whenArgs('2,3', async params => {
            let from = parseInt(params.args[1]),
                to = params.args[2];

            if (to == null)
                to = from + 1;
            else if (to === 'n')
                to = params.words.length;
            else
                to = parseInt(to);

            if (isNaN(from) || isNaN(to))
                return await Builder.defaults.notANumber(params);

            if (from > to)
                from = [to, to = from][0];

            return this.magicClean(params.words.slice(from, to).join(' '));
        })
        .whenArgs('>3', Builder.defaults.tooManyArguments)
        .build();