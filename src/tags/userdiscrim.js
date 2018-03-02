/*
 * @Author: stupid cat
 * @Date: 2017-05-07 19:19:52
 * @Last Modified by: stupid cat
 * @Last Modified time: 2017-05-07 19:19:52
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
  Builder.AutoTag('userdiscrim')
    .withArgs(a => [a.optional('user'), a.optional('quiet')])
    .withDesc('Returns the user\'s discriminator. If `user` is specified, gets that user instead.' +
      'If `quiet` is specified, if a user can\'t be found it will simply return the `user`')
    .withExample(
      'Your discrim is {userdiscrim}',
      'Your discrim is 1234'
    ).beforeExecute(Builder.util.processAllSubtags)
    .whenArgs('1-3', async function (params) {
      let user = bu.getUser(params.msg, params.args[1], params.args[2]);

      if (user != null)
        return user.discriminator;

      if (params.args[2])
        return params.args[1];
      return '';
    })
    .whenDefault(Builder.errors.tooManyArguments)
    .build();