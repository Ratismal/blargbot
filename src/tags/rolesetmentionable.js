/*
 * @Author: stupid cat
 * @Date: 2017-05-21 00:22:32
 * @Last Modified by: stupid cat
 * @Last Modified time: 2019-09-26 09:27:59
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.APITag('rolesetmentionable')
        .withArgs(a => [a.require('role'), a.optional('value'), a.optional('quiet')])
        .withDesc('Sets whether `role` can be mentioned. `value` can be either `true` to set the role as mentionable, ' +
            'or anything else to set it to unmentionable. If `value` isn\'t provided, defaults to `true`. ' +
            'If `quiet` is specified, if `role` can\'t be found it will simply return nothing')
        .withExample(
            'The admin role is now mentionable. {rolesetmentionable;admin;true}',
            'The admin role is now mentionable.'
        )
        .whenArgs(0, Builder.errors.notEnoughArguments)
        .whenArgs('1-3', async function (subtag, context, args) {
            let topRole = Builder.util.getRoleEditPosition(context);
            if (topRole == 0)
                return Builder.util.error(subtag, context, 'Author cannot edit roles');

            let quiet = bu.isBoolean(context.scope.quiet) ? context.scope.quiet : !!args[2],
                role = await context.getRole(args[0], {
                    quiet, suppress: context.scope.suppressLookup,
                    label: `${context.isCC ? 'custom command' : 'tag'} \`${context.tagName || 'unknown'}\``
                }),
                mentionable = bu.parseBoolean(args[1], true);

            if (role != null) {
                if (role.position >= topRole)
                    return Builder.util.error(subtag, context, 'Role above author');

                try {
                    let fullReason = bu.formatAuditReason(context.user, context.scope.reason);
                    await role.edit({ mentionable }, fullReason);
                    return;
                } catch (err) {
                    if (!quiet)
                        return Builder.util.error(subtag, context, 'Failed to edit role: no perms');
                }
            }
            return Builder.util.error(subtag, context, 'Role not found');
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();