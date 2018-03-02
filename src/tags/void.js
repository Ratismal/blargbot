/*
 * @Author: stupid cat
 * @Date: 2017-05-07 19:21:28
 * @Last Modified by: stupid cat
 * @Last Modified time: 2017-05-07 19:21:28
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
  Builder.AutoTag('void')
  .withArgs(a => a.optional('anything', true))
    .withDesc('Parses its inner tags, but doesn\'t return anything.')
    .withExample(
      '{void;This won\'t be outputted!}',
      ''
    ).beforeExecute(Builder.util.processAllSubtags)
    .whenDefault(async params => '')
    .build();