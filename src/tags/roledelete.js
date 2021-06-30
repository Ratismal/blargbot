/*
 * @Author: stupid cat
 * @Date: 2017-05-21 00:22:32
 * @Last Modified by: stupid cat
 * @Last Modified time: 2019-09-26 09:26:31
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const Builder = require('../structures/TagBuilder');

module.exports =
    Builder.APITag('roledelete')
        .withArgs(a => [a.require('role'), a.optional('quiet')])
        .withDesc('Deletes `role`. If `quiet` is specified, if `role` can\'t be found it will return nothing.\nWarning: this subtag is able to delete roles managed by integrations.')
        .withExample(
            '{roledelete;Super Cool Role!}',
            '(rip no more super cool roles for anyone)'
        )
        .whenArgs(0, Builder.errors.notEnoughArguments)
        .whenArgs('1-2', async function (subtag, context, args) {
            let topRole = Builder.util.getRoleEditPosition(context);
            if (topRole == 0)
                return Builder.util.error(subtag, context, 'Author cannot delete roles');

            let quiet = bu.isBoolean(context.scope.quiet) ? context.scope.quiet : !!args[1],
                role = await context.getRole(args[0], {
                    quiet, suppress: context.scope.suppressLookup,
                    label: `${context.isCC ? 'custom command' : 'tag'} \`${context.tagName || 'unknown'}\``
                });
            if (role) {
                if (role.position >= topRole)
                    return Builder.util.error(subtag, context, 'Role above author');

                try {
                    let reason = bu.formatAuditReason(context.user, context.scope.reason);
                    await role.delete(reason);
                } catch (err) {
                    console.error(err.stack);
                    return Builder.util.error(subtag, context, 'Failed to delete role: no perms');
                }
            }
        })
        .whenDefault(Builder.errors.tooManyArguments)
        .build();
