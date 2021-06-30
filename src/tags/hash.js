/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:47:35
 * @Last Modified by: stupid cat
 * @Last Modified time: 2017-05-07 18:47:35
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.AutoTag('hash')
        .withArgs(a => a.require('text'))
        .withDesc('Returns the numeric hash of `text`, based on the unicode value of each individual character. ' +
            'This results in seemingly randomly generated numbers that are constant for each specific query.')
        .withExample(
            'The hash of brown is {hash;brown}.',
            'The hash of brown is 94011702.'
        )
        .whenArgs(0, Builder.errors.notEnoughArguments)
        .whenArgs(1, async function (subtag, context, args) {
            return args[0].split('').reduce(function (a, b) {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();