const { GeneralCommand } = require('../../../Core/Structures/Command');
const util = require('util');
const { TagContext } = require('../../../Core/Tag');

class TagCommand extends GeneralCommand {
    constructor(client) {
        super(client, {
            name: 'tag',
            aliases: 't',
            subcommands: {
                set: { minArgs: 2 },
                delete: { minArgs: 1 },
                rename: { minArgs: 2 },
                raw: { minArgs: 1 },
                info: { minArgs: 1 },
                transfer: { minArgs: 2 },
                top: {},
                author: { minArgs: 1 },
                search: { minArgs: 1 },
                list: {},
                favorite: {},
                report: { minArgs: 1 },
                test: { minArgs: 1 },
                help: {},
                docs: {},
                setdesc: { minArgs: 1 }
            },
            subcommandAliases: {
                remove: 'delete',
                favourite: 'favorite',
                add: 'set',
                create: 'set',
                edit: 'set'
            },
            keys: {
                dontown: '.dontown',
                notag: '.notag',
                tagset: '.tagset',
                tagrename: '.tagrename',
                raw: '.raw',
                alreadyexists: '.alreadyexists',
                testoutput: '.testoutput',
                help: '.info',
                subcommandNotFound: '.subcommandnotfound',
                transferprompt: '.transferprompt',
                nobots: '.nobots',
                transfercancelled: '.transfercancelled',
                transfercomplete: '.transfercomplete',
                taginfo: '.taginfo',
                usageupdate: '.usageupdate',
                usagereset: '.usagereset',
                descupdate: '.descupdate',
                descreset: '.descreset'
            }
        });

    }

    async getTag(name) {
        const data = await this.client.getDataTag(name);
        let tag;
        try {
            tag = await data.getObject();
        } catch (err) { }
        return { data, tag };
    }

    async ownershipTest(ctx) {
        const { data, tag } = await this.getTag(ctx.input._[0]);
        if (!tag) {
            await ctx.decodeAndSend(this.keys.notag);
        } else if (tag.get('authorId') !== ctx.author.id) {
            await ctx.decodeAndSend(this.keys.dontown);
        } else {
            return { data, tag, owner: true };
        }
        return { data, tag, owner: false };
    }

    async execute(ctx) {
        if (ctx.input._.length == 0) return await this.sub_help(ctx);
        const { data, tag } = await this.getTag(ctx.input._[0]);
        if (!tag)
            await ctx.decodeAndSend(this.keys.notag);
        else {
            const tagContext = new TagContext(ctx.client, {
                ctx, content: tag.get('content'),
                author: tag.get('authorId'), name: tag.get('tagName'),
                isCustomCommand: false
            }, data);
            await ctx.send((await tagContext.process()).toString());
            await data.incrementUses();
        }
    }

    async sub_set(ctx) {
        const { data, tag } = await this.getTag(ctx.input._[0]);
        if (tag && tag.get('authorId') !== ctx.author.id) {
            await ctx.decodeAndSend(this.keys.dontown);
            return;
        }
        let content = ctx.input._.slice(1).join(' ').replace(/\n /g, '\n');
        if (!tag)
            await data.create({
                content,
                authorId: ctx.author.id
            });
        else await data.setContent(content);
        await ctx.decodeAndSend(this.keys.tagset, {
            name: ctx.input._[0], process: await ctx.decode(`generic.${tag ? 'edited' : 'created'}`)
        });
    }

    async sub_delete(ctx) {
        const { data, tag, owner } = await this.ownershipTest(ctx);
        if (owner) {
            await tag.destroy();
            await ctx.decodeAndSend(this.keys.tagset, {
                name: ctx.input._[0], process: await ctx.decode('generic.deleted')
            });
        }
    }

    async sub_rename(ctx) {
        const { data, tag, owner } = await this.ownershipTest(ctx);
        const tag2 = await this.getTag(ctx.input._[1]);
        if (tag2.tag) {
            await ctx.decodeAndSend(this.keys.alreadyexists);
        } else if (owner) {
            await data.rename(ctx.input._[1]);
            await ctx.decodeAndSend(this.keys.tagrename, {
                old: ctx.input._[0], new: ctx.input._[1]
            });
        }
    }

    async sub_raw(ctx) {
        const { data, tag } = await this.getTag(ctx.input._[0]);
        if (!tag)
            await ctx.decodeAndSend(this.keys.notag);
        else {
            await ctx.decodeAndSend(this.keys.raw, {
                name: ctx.input._[0], code: tag.get('content')
            });
        }
    }

    async sub_transfer(ctx) {
        const { data, tag, owner } = await this.ownershipTest(ctx);
        if (owner) {
            let user = await this.client.Helpers.Resolve.user(ctx, ctx.input._[1]);
            if (user) {
                if (user.bot) return await ctx.decodeAndSend(this.keys.nobots);
                let menu = this.client.Helpers.Menu.build(ctx);
                menu.embed.setContent(await ctx.decode(this.keys.transferprompt, {
                    target: user.mention,
                    user: ctx.author.fullName,
                    tag: await tag.get('tagName')
                }));
                try {
                    await menu.setUserId(user.id).addConfirm().addCancel().awaitConfirmation();
                    await data.setAuthor(user.id);
                    await ctx.decodeAndSend(this.keys.transfercomplete, {
                        user: user.fullName,
                        tag: await tag.get('tagName')
                    });
                } catch (err) {
                    if (typeof err === 'string') {
                        await ctx.decodeAndSend(this.keys.transfercancelled);
                    } else throw err;
                }
            }
        }
    }

    async sub_info(ctx) {
        const { data, tag } = await this.getTag(ctx.input._[0]);
        if (tag) {
            let author = this.client.users.get(await data.getAuthor()) || await this.client.getRESTUser(await data.getAuthor()) || { fullName: 'Clyde#0000' };
            await ctx.decodeAndSend(this.keys.taginfo, {
                name: await tag.get('tagName'),
                author: author.fullName,
                lastModified: await tag.get('updatedAt'),
                uses: await data.getUses(),
                favourites: await data.getFavourites(),
                usage: await data.getUsage() || '',
                desc: await data.getDesc() || ''
            });
        } else ctx.decodeAndSend(this.keys.notag);
    }

    async sub_top(ctx) {
        await ctx.send('top');

    }

    async sub_author(ctx) {
        await ctx.send('author');

    }

    async sub_search(ctx) {
        await ctx.send('search');

    }

    async sub_list(ctx) {
        await ctx.send('list');

    }

    async sub_favorite(ctx) {
        await ctx.send('favorite');

    }

    async sub_report(ctx) {
        await ctx.send('report');
    }

    async sub_test(ctx) {
        const data = this.client.getDataTag('test');
        await data.getOrCreateObject();
        const tagContext = new TagContext(ctx.client, {
            ctx, content: ctx.input._.raw.join(''),
            author: ctx.author.id, name: 'test',
            isCustomCommand: false
        }, data);
        let output = await tagContext.process() || '';
        await ctx.decodeAndSend(this.keys.testoutput, {
            output: output.toString().trim()
        });
    }

    async sub_setdesc(ctx) {
        const { data, tag, owner } = await this.ownershipTest(ctx);
        if (owner) {
            let toSet = null;
            if (ctx.input._.length > 1) toSet = ctx.input._.raw.slice(1).join('');
            if (toSet && toSet.length > 1000) {
                return ctx.decodeAndSend('error.inputtoolong', {
                    length: toSet.length,
                    max: 100
                });
            }
            await data.setDesc(toSet);
            if (toSet) await ctx.decodeAndSend(this.keys.descupdate, {
                tag: await tag.get('tagName')
            });
            else await ctx.decodeAndSend(this.keys.descreset, {
                tag: await tag.get('tagName')
            });
        }
    }

    async sub_help(ctx) {
        if (ctx.input._.length === 0) {
            await ctx.decodeAndSend(this.keys.info, {
                subcommands: Object.keys(this.subcommands).map(s => `**${s}**`).join(', ')
            });
        } else {
            let query = ctx.input._[0].toLowerCase();
            let name = this.subcommandAliases[query] || query;
            let subcommand = this.subcommands[name];
            if (!subcommand) {
                await ctx.decodeAndSend(this.keys.subcommandNotFound, {
                    subcommand: name
                });
            } else {
                await ctx.decodeAndSend('generic.commandhelp', {
                    name: `tag ${name}`,
                    info: await ctx.decode(subcommand.info),
                    usage: await ctx.decode(subcommand.usage),
                    aliases: Object.keys(this.subcommandAliases).filter(a => this.subcommandAliases[a] === name).join(', ') || ''
                });
            }
        }
    }
}

module.exports = TagCommand;