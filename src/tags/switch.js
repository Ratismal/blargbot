/*
 * @Author: stupid cat
 * @Date: 2017-05-07 19:05:28
 * @Last Modified by: stupid cat
 * @Last Modified time: 2018-02-06 17:09:54
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.AutoTag('switch')
        .acceptsArrays()
        .withArgs(a => [
            a.require('value'),
            a.optional([
                a.require('case'),
                a.require('then')
            ], true),
            a.optional('default')
        ])
        .withDesc('Finds the `case` that matches `value` and returns the following `then`.' +
            'If there is no matching `case` and `default` is specified,' +
            '`default` is returned. If not, it returns blank.'
        ).withExample(
            '{switch;{args;0};\n  yes;\n    Correct!;\n  no;\n    Incorrect!;\n  That is not yes or no\n}',
            'yes',
            'Correct!'
        ).whenArgs('1', Builder.errors.notEnoughArguments)
        .whenDefault(async function (params) {
            let value = await bu.processTagInner(params, 1),
                indexes = [...params.args.keys()].splice(2).reverse(),
                cases = {}, elseDo = -1;

            if (indexes.length % 2 == 1) elseDo = indexes.shift();

            for (let i = 0; i < indexes.length; i += 2) {
                let caseValue = await bu.processTagInner(params, indexes[i + 1]);
                for (const key of Builder.util.flattenArgArrays([caseValue]))
                    cases[key] = indexes[i];
            }

            let result = cases[value] || elseDo;
            if (result != -1)
                return await bu.processTagInner(params, result);
        }).build();