/*
 * @Author: stupid cat
 * @Date: 2017-05-07 19:34:15
 * @Last Modified by: stupid cat
 * @Last Modified time: 2018-09-13 19:13:30
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const argFactory = require('../structures/ArgumentFactory'),
    af = argFactory,
    bbEngine = require('../structures/bbtag/Engine'),
    { BBTag, SubTag } = require('../structures/bbtag/Tag');

async function executeTag(msg, tagName, command) {
    let tag = await r.table('tag').get(tagName).run();
    if (!tag)
        bu.send(msg, `❌ That tag doesn't exist! ❌`);
    else {
        if (tag.deleted === true) {
            await bu.send(msg, `❌ That tag has been permanently deleted by **${bu.getFullName(bot.users.get(tag.deleter))}**

Reason: ${tag.reason}`);
            return;
        }
        r.table('tag').get(tagName).update({
            uses: tag.uses + 1,
            lastuse: r.now()
        }).run();
        let result = await bbEngine.runTag({
            msg,
            limits: new bbtag.limits.tag(),
            tagContent: tag.content,
            flags: tag.flags,
            input: command.map(c => '"' + c + '"').join(' '),
            isCC: false,
            tagName: tagName,
            author: tag.author,
            authorizer: tag.authorizer,
            cooldown: tag.cooldown
        });
        /** @type {string} */
        result.code = tag.content;
        return result;
    }
};

async function executeCC(msg, ccName, command) {
    let ccommand = (await bu.getGuild(msg.guild.id)).ccommands[ccName.toLowerCase()];
    if (!ccommand)
        bu.send(msg, `❌ That CCommand doesn't exist! ❌`);
    else {
        let result = await bbEngine.runTag({
            msg,
            limits: new bbtag.limits.ccommand(),
            tagContent: ccommand.content,
            flags: ccommand.flags,
            input: command.map(c => '"' + c + '"').join(' '),
            isCC: true,
            tagName: ccName,
            author: ccommand.author,
            authorizer: ccommand.authorizer
        });
        /** @type {string} */
        result.code = ccommand.content;
        return result;
    }
};

async function docs(msg, command, topic) {
    let help = CommandManager.built['help'],
        argsOptions = { separator: { default: ';' } },
        tags = Object.keys(TagManager.list).map(k => TagManager.list[k]),
        words = (topic || 'index').toLowerCase().split(' '),
        prefix = '',
        embed = {
            title: 'BBTag documentation',
            url: 'https://blargbot.xyz/tags',
            color: 0Xefff00//,
            // author: {
            //     name: bot.user.username,
            //     icon_url: bot.user.avatarURL
            // }
        };
    if (msg.channel.guild)
        prefix = await bu.guildSettings.get(msg.channel.guild.id, 'prefix') || config.discord.defaultPrefix;
    if (Array.isArray(prefix)) prefix = prefix[0];

    switch (words[0]) {
        case 'index':
            embed.description = [
                'Please use `' + prefix + command + ' docs [topic]` to view available information on a topic.\n',
                'Available Topics:',
                '- subtags <category>',
                '- variables',
                '- argTypes',
                '- terminology',
                '- dynamic\n',
                'Available Subtag Categories:',
                ...Object.values(bu.TagType.properties).map(k => '- ' + k.name)
            ].join('\n');
            // embed.fields = Object.keys(bu.TagType.properties)
            //     .map(k => {
            //         return {
            //             properties: bu.TagType.properties[k],
            //             tags: tags.filter(t => t.category == k)
            //         };
            //     }).filter(c => c.tags.length > 0)
            //     .map(c => {
            //         return {
            //             name: c.properties.name + ' subtags - ' + c.properties.desc,
            //             value: '```\n' + c.tags.map(t => t.name).join(', ') + '```'
            //         };
            //     }).concat({
            //         name: 'Other useful topics',
            //         value: '```\nvariables, argTypes, terminology, dynamic```'
            //     }).filter(f => f.value.length > 0);
            return await help.sendHelp(msg, { embed }, 'BBTag documentation', true);
        case 'subtags':
            const category = Object.keys(bu.TagType.properties).map(k => {
                return {
                    properties: bu.TagType.properties[k],
                    id: k
                };
            }).find(k => k.properties.name.toLowerCase() === (words[1] || '').toLowerCase());
            if (category) {
                const subtags = tags.filter(t => t.category == category.id);
                embed.description = [
                    `**${category.properties.name} Subtags** - ${category.properties.desc}`,
                    '```',
                    subtags.map(t => t.name).join(', '),
                    '```'
                ].join('\n');
            } else {
                embed.description = [
                    'Available Subtag Categories:',
                    ...Object.values(bu.TagType.properties).map(k => '- ' + k.name + ' - ' + k.desc)
                ].join('\n');
            }
            return await help.sendHelp(msg, { embed }, 'BBTag documentation', true);
        case 'variables':
        case 'variable':
        case 'vars':
        case 'var':
            let tagTypes = bu.tagVariableScopes;
            embed.description = 'In BBTag there are ' + tagTypes.length + ' different scopes that can be used for storing your data. ' +
                'These scopes are determined by the first character of your variable name, so choose carefully!\nThe available scopes are as follows:';
            embed.title += ' - Variables';
            embed.url += '/variables';
            embed.fields = tagTypes.map(t => {
                return {
                    name: t.name + ' variables' + (t.prefix.length > 0 ? ' (prefix: ' + t.prefix + ' )' : ''),
                    value: t.description + '\n\u200B'
                };
            });
            embed.fields.push({
                name: '{commit} and {rollback}',
                value: 'For performance reasons, when a value is `{set}` it wont be immediately populated to the database. ' +
                    '`{commit}` and `{rollback}` can be used to manipulate when variables are sent to the database, if at all. ' +
                    '`{commit}` will force the given variables to be sent to the database immediately. `{rollback}` will ' +
                    'revert the given variables to their original value (start of tag or most recent `{commit}`).\n' +
                    'There is also an additional prefix for {set} and {get} which is `!`. ' +
                    'This prefix can be combined with other prefixes and will act the ' +
                    'same as if you have called `{set}` and then `{commit}` immediately after. e.g. ' +
                    '```{set;!@varname;value}``` is identical to ```{set;@varname;value}{commit;@varname}```'
            });
            return await help.sendHelp(msg, { embed }, 'BBTag documentation', true);
        case 'argtypes':
        case 'arguments':
        case 'parameters':
        case 'params':
            embed.title += ' - Arguments';
            embed.description = 'As you may have noticed, the various help documentation for subtags will have a usage that often look like this: ```\n{subtag;' +
                argFactory.toString([af.require('arg1'), af.optional('arg2'), af.require('arg3', true)], argsOptions) + '}```' +
                'This way of formatting arguments is designed to easily be able to tell you what is and is not required.\n' +
                'All arguments are separated by `;`\'s and each will be displayed in a way that tells you what kind of argument it is.\n' +
                'NOTE: Simple subtags do not accept any arguments and so should not be supplied any.\n' +
                'The basic rules are as follows:\n\u200B';
            embed.fields = [
                {
                    name: 'Required arguments <>',
                    value: 'Example:```\n' + argFactory.toString(af.require('arg'), argsOptions) + '```' +
                        'Required arguments must be supplied for a subtag to work. If they are not then you will normally be given a `Not enough args` error\n\u200B'
                },
                {
                    name: 'Optional arguments []',
                    value: 'Example:```\n' + argFactory.toString(af.optional('arg'), argsOptions) + '```' +
                        'Optional arguments may or may not be provided. If supplied, optional arguments may either change the functionality of the tag ' +
                        '(e.g. `' + prefix + command + ' docs shuffle`) or simply replace a default value (e.g. `' + prefix + command + ' docs username`).\n\u200B'
                },
                {
                    name: 'Multiple arguments ...',
                    value: 'Example:```\n' + argFactory.toString(af.require('arg', true), argsOptions) + '```' +
                        'Some arguments can accept multiple values, meaning you are able to list additional values, still separated by `;`, which will be included in the execution. ' +
                        '(e.g. `' + prefix + command + ' docs randchoose`)\n\u200B'
                },
                {
                    name: 'Nested arguments <<> <>>',
                    value: 'Example:```\n' + argFactory.toString(af.require([af.require('arg1'), af.optional('arg2')], true), argsOptions) + '```' +
                        'Some subtags may have special rules for how their arguments are grouped (e.g. `' + prefix + command + ' docs switch`) ' +
                        'and will use nested arguments to show that grouping. When actually calling the subtag, you provide the arguments as normal, ' +
                        'however you must obey the grouping rules.\n' +
                        'In the example of `switch`, you may optionally supply `<case>` and `<then>` as many times as you like ' +
                        'but they must always be in pairs. e.g. `{switch;value;case1;then1}` or `{switch;value;case1;then1;case2;then2}` etc'
                }
            ];
            return await help.sendHelp(msg, { embed }, 'BBTag documentation', true);
        case 'terms':
        case 'terminology':
        case 'definitions':
        case 'define':
            let terms = {
                BBTag: 'BBTag is a text replacement language. Any text between a `{` and `}` pair (called a subtag) ' +
                    'will be taken as code and run, with the output of that replacing the whole subtag. ' +
                    'Each subtag does something different, and each accepts its own list of arguments.',
                Subtag: 'A subtag is a pre-defined function that accepts some arguments and returns a single output. ' +
                    'Subtags can be called by placing their name between a pair of `{` and `}`, ' +
                    'with any arguments to be passed to the subtag being separated by `;`.\nAs an example:```{math;+;1;2}```' +
                    'Subtag: `math`\nArguments: `+`, `1`, `2`\nResult: `3`',
                Tag: 'A tag is a user-made block of text which may or may not contain subtags. ' +
                    'Any subtags that it does contain will be executed and be replaced by their output.',
                Argument: 'An argument is a single value which gets given to a subtag. Arguments can be numbers, text, arrays, anything you can type really. ' +
                    'Each subtag will require a different argument pattern, so be sure to check what pattern your subtag needs!',
                Variable: 'A variable is a value that is stored in the bots memory ready to access it later on. ' +
                    'For more in-depth details about variables, please use `' + prefix + command + ' docs variable`.',
                Array: 'An array is a collection of values all grouped together, commonly done so by enclosing them inside `[]`. ' +
                    'In BBTag, arrays can be assigned to a variable to store them for later use. In this situation, you might ' +
                    'see an array displayed like this `{"v":["1","2","3"],"n":"varname"}`. If you do, dont worry, nothing is broken! ' +
                    'That is just there to allow ' + bot.user.username + ' to modify the array in place within certain subtags.'
            };
            embed.title += ' - Terminology';

            let term = Object.keys(terms).filter(k => k.toLowerCase() == (words[1] || '').toLowerCase())[0];
            if (term != null) {
                embed.title += ' - ' + term;
                embed.description = terms[term];
                return await help.sendHelp(msg, { embed }, 'BBTag documentation');
            }

            embed.description = 'There are various terms used in BBTag that might not be intuitive, ' +
                'so here is a list of definitions for some of the most important ones:\n\u200B';
            embed.fields = Object.keys(terms).map(k => {
                return {
                    name: k,
                    value: terms[k] + '\n\u200B'
                };
            });
            return await help.sendHelp(msg, { embed }, 'BBTag documentation');
        case 'dynamic':
            embed.description = 'In bbtag, even the names of subtags can be dynamic. This can be achieved simply by placing subtags before the ' +
                'first `;` of a subtag. \n e.g. ```{user{get;~action};{userid}}``` If `~action` is set to `name`, then this will run the `username` subtag, ' +
                'if it is set to `avatar` then it will run the `useravatar` subtag, and so on. Because dynamic subtags are by definition not set in ' +
                'stone, it is reccommended not to use them, and as such you will recieve warnings when editing/creating a tag/cc which contains a ' +
                'dynamic subtag. Your tag will function correctly, however some optimisations employed by bbtag will be unable to run on any such tag.';
            return await help.sendHelp(msg, { embed }, 'BBTag documentation');
        default:
            topic = topic.replace(/[\{\}]/g, '');
            let tag = TagManager.get(topic.toLowerCase());
            if (tag == null)
                break;
            embed.title += ' - ' + tag.name[0].toUpperCase() + tag.name.substring(1);

            embed.description = '';
            if (tag.deprecated) {
                embed.color = 0xff0000;
                embed.description += '**This subtag is deprecated' + (typeof tag.deprecated == 'string'
                    ? ' and has been replaced by `{' + tag.deprecated + '}`'
                    : '') + '**\n';
            }
            embed.description += '```\n{' + [tag.name, argFactory.toString(tag.args, argsOptions)].filter(t => t.length > 0).join(';') + '}```';
            embed.description += tag.desc + '\n';

            embed.url += '/#' + encodeURIComponent(tag.name);
            embed.fields = [];
            if (tag.aliases)
                embed.fields.push({
                    name: 'Aliases',
                    value: tag.aliases.join(', ') + '\n\u200B'
                });
            else
                embed.description += '\u200B';

            for (const key of Object.keys(limits)) {
                let text = limitToSring(key, tag.name);
                if (text) {
                    embed.fields.push({
                        name: `Limits for ${limits[key].instance._name}s`,
                        value: text,
                        inline: true
                    });
                }
            }

            if (tag.exampleCode)
                embed.fields.push({
                    name: 'Example code',
                    value: '```csharp\n' + tag.exampleCode + '```'
                });
            if (tag.exampleIn)
                embed.fields.push({
                    name: 'Example user input',
                    value: '```\n' + tag.exampleIn + '```'
                });
            if (tag.exampleOut)
                embed.fields.push({
                    name: 'Example output',
                    value: '```' + tag.exampleOut + '```'
                });

            embed.fields.push({
                name: '\u200B',
                value: '*Use `' + prefix + command + ' docs arguments` for detailed info about the argument syntax!*'
            });
            return await help.sendHelp(msg, { embed }, 'BBTag documentation', true);
    }

    return await bu.send(msg, 'Oops, I didnt recognise that topic! Try using `' + prefix + command + ' docs` for a list of all topics');
};

function limitToSring(scope, subtag) {
    if (limits[scope]) {
        let limit = limits[scope].instance[subtag];
        if (limit !== undefined) {
            let limitText = '';
            if (limit.disabled) {
                limitText += `- {${subtag}} is disabled\n`;
            } else {
                if (limit.staff) {
                    limitText += '- Author must be staff\n';
                }
                if (limit.count !== undefined) {
                    limitText += `- Maximum ${limit.count} uses\n`;
                }
                if (limit.loops !== undefined) {
                    limitText += `- Maximum ${limit.loops} loops\n`;
                }
                if (limit.max !== undefined) {
                    limitText += ` Maximum Duration: ${limit.max}\n`;
                }
            }
            return limitText.trim();
        }
    }
}

function generateDebug(code, context) {
    if (arguments.length == 1)
        return (context) => this.generateDebug(code, context);

    let errors = viewErrors(...context.errors);
    let debug = (context.debug || []).map(entry => `[${entry.tag.range.start}]${entry.text}`).join('\n');
    let variables = Object.keys(context.variables.cache)
        .map(key => {
            let offset = ''.padStart(key.length + 2, ' ');
            let json = JSON.stringify(context.variables.cache[key].value);
            json.replace(/\n/, '\n' + offset);
            return key + ': ' + json;
        }).slice(0, 24);
    let subtags = Object.keys(context.state.subtags).map(s => {
        return {
            name: s, times: context.state.subtags[s],
            average: context.state.subtags[s].reduce((a, b) => a + b) / context.state.subtags[s].length,
            total: context.state.subtags[s].reduce((a, b) => a + b)
        };
    });
    subtags.sort((a, b) => b.average - a.average);
    subtags = subtags.map(s => `${s.name}: Average ${s.average}ms | Total ${s.total}ms\n${s.times.map(ss => ss + 'ms').join(', ')}`);
    return {
        name: 'BBTag.debug.txt',
        file: 'User input:\n' + JSON.stringify(context.input.length > 0 ? context.input : 'No input.') + '\n\n' +
            'Code Executed:\n' + code + '\n\n' +
            (debug.length > 0 ? 'Debug:\n' + debug + '\n\n' : '') +
            'Errors:\n' + (errors.length > 0 ? errors.join('\n') : 'No errors') + '\n\n' +
            'Variables:\n' + (variables.length > 0 ? variables.join('\n') : 'No variables') + '\n\n' +
            'Subtag Breakdown:\n' + subtags.join('\n\n')
    };
};

/**
 *
 * @param {string} code
 * @returns {AnalysisResult[]}
 */
function analyze(code) {
    let parsed = bbEngine.parse(code);
    if (!parsed.success) {
        return parsed.error;
    }
    return [...analyzeString(parsed.bbtag, [])];
}

/** 
 * @typedef {Object} AnalysisResult 
 * @property {SubTag} subtag
 * @property {string} [error]
 * @property {string} [warning]
 * */


/**
 * 
 * @param {BBTag} bbtag
 * @param {string[]} parents
 * @returns {IterableIterator<AnalysisResult>}
 */
function* analyzeString(bbtag, parents) {
    for (const child of bbtag.children) {
        yield* analyzeSubtag(child, parents);
    }
}

/**
 * 
 * @param {SubTag} subtag
 * @param {string[]} parents
 * @returns {IterableIterator<AnalysisResult>}
 */
function* analyzeSubtag(subtag, parents) {
    const name = subtag.name;
    if (!name || !name.content) {
        yield { subtag, error: 'Unnamed subtag' };
        for (const child of subtag.children) {
            yield* analyzeString(child, parents);
        }
        return;
    } else if (name.children.length > 0) {
        yield { subtag, warning: 'Dynamic subtag' };
        for (const child of subtag.children) {
            yield* analyzeString(child, parents);
        }
        return;
    }

    const nameStr = name.content.toLowerCase();
    if (nameStr === '//') { return; }

    if (['lock'].includes(nameStr) && parents.includes('lock')) {
        yield { subtag, error: '{lock} subtags cannot be nested' };
    } else if (TagManager.get('waitmessage').overrideSubtags.includes(nameStr)) {
        const parent = parents.find(n => ['waitmessage', 'waitreact', 'filter'].includes(n));
        if (parent) {
            yield { subtag, error: `Cannot use {${nameStr}} inside of {${parent}}` };
        }
    }

    const definition = findSubtag(nameStr, parents);

    if (!definition) {
        yield { subtag, error: `Unknown subtag {${name.content}}` };
    } else if (definition.deprecated) {
        yield {
            subtag,
            warning: `{${nameStr}} is deprecated` + (typeof definition.deprecated === 'string'
                ? `. Please use {${definition.deprecated}} instead`
                : '')
        };
    }


    parents.push(nameStr);
    for (const child of subtag.children) {
        yield* analyzeString(child, parents);
    }
    parents.pop();
}

/**
 * @param {string} name
 * @param {string[]} parents
 * @returns {{deprecated: boolean} | undefined}
 */
function findSubtag(name, parents) {
    const definition = TagManager.get(name);
    if (definition) {
        return definition;
    }
    if (name.startsWith('func.')) {
        return { deprecated: false };
    }
    if (['params', 'paramsarray', 'paramslength'].includes(name) && parents.some(p => p === 'func' || p === 'function')) {
        return { deprecated: false };
    }
}

/**
 * 
 * @param {SubTag} subtag
 * @param {(name: string) => boolean} check
 * @returns {boolean}
 */
function findParent(subtag, check) {
    while (subtag.parent && subtag.parent.parent) {
        subtag = subtag.parent.parent;
        const name = subtag.children[0];
        if (!name) { continue; }
        if (check(name.content)) {
            return true;
        }
    }
    return false;
}

function addAnalysis(code, baseText) {
    let analysis = analyze(code);
    if (typeof analysis === 'string') {
        baseText += `\n${analysis}`;
    } else {
        for (const entry of analysis) {
            if (entry.error) {
                baseText += `\n🚫 [${entry.subtag.range.start}] ${entry.error}`;
            }
            if (entry.warning) {
                baseText += `\n⚠ [${entry.subtag.range.start}] ${entry.warning}`;
            }
        }
    }

    return baseText;
}

function viewErrors(...errors) {
    let result = [];
    for (const e of errors) {
        let text = '';
        if (e.tag.range == null)
            text += 'General';
        else
            text += `Position [${e.tag.range.toString('-')}]`;
        text += ': ';

        if (typeof e.error == 'string') {
            result.push(text + e.error);
            continue;
        }

        let offset = ''.padStart(text.length, ' ');
        let lines = viewErrors(...e.error).map(l => offset + l);
        lines[0] = text + (lines[0] || '').substring(offset.length);
        result.push(...lines);
    }
    return result;
}

const limits = {
    tag: class TagLimits {
        constructor() {
            this._name = 'tag';
            this.ban = { disabled: true };
            this.unban = { disabled: true };
            this.guildbans = { disabled: true };

            this.kick = { disabled: true };

            this.modlog = { disabled: true };
            this.pardon = { disabled: true };
            this.warn = { disabled: true };
            this.reason = { disabled: true };
            this.slowmode = { disabled: true };

            this.roleadd = { disabled: true };
            this.rolecreate = { disabled: true };
            this.roledelete = { disabled: true };
            this.roleremove = { disabled: true };
            this.rolesetmentionable = { disabled: true };
            this.rolesetperms = { disabled: true };
            this.rolesetposition = { disabled: true };

            this.guildseticon = { disabled: true };

            this.emojicreate = { disabled: true };
            this.emojidelete = { disabled: true };

            this.channelcreate = { disabled: true };
            this.channeldelete = { disabled: true };
            this.channeledit = { disabled: true };
            this.channelsetperms = { disabled: true };
            this.channelsetpos = { disabled: true };

            this.dm = { disabled: true };
            this.send = { disabled: true };
            this.edit = { count: 10 };
            this.delete = { count: 11 };

            this.reactremove = { count: 10, requests: 40 };

            this.timer = { disabled: true };

            this.usersetnick = { disabled: true };

            this.waitmessage = { count: 5 };
            this.waitreaction = { count: 20 };

            this.for = { loops: 1500 };
            this.foreach = { loops: 3000 };
            this.map = { loops: 3000 };

            this.dump = { count: 5 };
        }

        get repeat() { return this.for; }
        get while() { return this.for; }
    },
    ccommand: class CCLimits {
        constructor() {
            this._name = 'custom command';
            this.ban = { staff: true };
            this.unban = { staff: true };
            this.guildbans = { staff: true };

            this.kick = { staff: true };

            this.modlog = { staff: true };
            this.pardon = { staff: true };
            this.warn = { staff: true };
            this.reason = { staff: true };
            this.slowmode = { staff: true };

            this.roleadd = { staff: true };
            this.rolecreate = { staff: true };
            this.roledelete = { staff: true };
            this.rolemention = { staff: true };
            this.roleremove = { staff: true };
            this.rolesetmentionable = { staff: true };
            this.rolesetperms = { staff: true };
            this.rolesetposition = { staff: true };

            this.guildseticon = { staff: true, count: 1 };

            this.emojicreate = { staff: true };
            this.emojidelete = { staff: true };

            this.channelcreate = { staff: true };
            this.channeldelete = { staff: true };
            this.channeledit = { staff: true };
            this.channelsetperms = { staff: true };
            this.channelsetpos = { staff: true };

            this.dm = { staff: true, count: 1 };
            this.send = { staff: true, count: 10 };
            this.edit = { count: 10 };
            this.delete = { count: 11 };

            this.reactremove = { count: 10, requests: 40 };

            this.timer = { staff: true, count: 3 };

            this.usersetnick = { staff: true };

            this.waitmessage = { count: 10 };
            this.waitreaction = { count: 20 };

            this.for = { loops: 1500 };
            this.foreach = { loops: 3000 };
            this.map = { loops: 3000 };

            this.dump = { count: 5 };
        }

        get repeat() { return this.for; }
        get while() { return this.for; }
    },
    autoresponse_general: class GeneralARLimits {
        constructor() {
            this._name = 'general autoresponse';

            this.ban = { staff: true };
            this.unban = { staff: true };
            this.guildbans = { staff: true };

            this.kick = { staff: true };

            this.modlog = { staff: true };
            this.pardon = { staff: true };
            this.warn = { staff: true };
            this.reason = { staff: true };
            this.slowmode = { staff: true };

            this.roleadd = { staff: true };
            this.rolecreate = { staff: true };
            this.roledelete = { staff: true };
            this.rolemention = { staff: true };
            this.roleremove = { staff: true };
            this.rolesetmentionable = { staff: true };
            this.rolesetperms = { staff: true };
            this.rolesetposition = { staff: true };

            this.guildseticon = { staff: true, count: 1 };

            this.emojicreate = { staff: true };
            this.emojidelete = { staff: true };

            this.channelcreate = { staff: true };
            this.channeldelete = { staff: true };
            this.channeledit = { staff: true };
            this.channelsetperms = { staff: true };
            this.channelsetpos = { staff: true };

            this.dm = { staff: true, count: 1 };
            this.send = { staff: true, count: 1 };
            this.edit = { count: 1 };
            this.delete = { count: 2 };

            this.reactremove = { count: 1, requests: 20 };

            this.timer = { disabled: true };
            this.sleep = { max: 5000 };

            this.usersetnick = { staff: true };

            this.waitmessage = { disabled: true };
            this.waitreaction = { disabled: true };

            this.for = { loops: 1000 };
            this.foreach = { loops: 2000 };
            this.map = { loops: 2000 };

            this.dump = { count: 5 };
        }
        get repeat() { return this.for; }
        get while() { return this.for; }
    }, autoresponse_everything: class EverythingARLimits {
        constructor() {
            this._name = 'everything autoresponse';

            this.ban = { staff: true };
            this.unban = { staff: true };
            this.guildbans = { staff: true };

            this.kick = { staff: true };

            this.modlog = { staff: true };
            this.pardon = { staff: true };
            this.warn = { staff: true };
            this.reason = { staff: true };
            this.slowmode = { staff: true };

            this.roleadd = { staff: true };
            this.rolecreate = { staff: true };
            this.roledelete = { staff: true };
            this.rolemention = { staff: true };
            this.roleremove = { staff: true };
            this.rolesetmentionable = { staff: true };
            this.rolesetperms = { staff: true };
            this.rolesetposition = { staff: true };

            this.guildseticon = { staff: true, count: 1 };

            this.emojicreate = { staff: true };
            this.emojidelete = { staff: true };

            this.channelcreate = { staff: true };
            this.channeldelete = { staff: true };
            this.channeledit = { staff: true };
            this.channelsetperms = { staff: true };
            this.channelsetpos = { staff: true };

            this.dm = { staff: true, count: 1 };
            this.send = { staff: true, count: 1 };
            this.edit = { count: 1 };
            this.delete = { count: 2 };

            this.reactremove = { count: 1, requests: 20 };

            this.timer = { disabled: true };
            this.sleep = { max: 5000 };

            this.usersetnick = { staff: true };

            this.waitmessage = { disabled: true };
            this.waitreaction = { disabled: true };

            this.for = { loops: 500 };
            this.foreach = { loops: 1000 };
            this.map = { loops: 1000 };

            this.dump = { count: 5 };
        }
        get repeat() { return this.for; }
        get while() { return this.for; }
    }
};

for (const key of Object.keys(limits)) {
    limits[key].instance = new limits[key]();
}

module.exports = {
    executeTag,
    executeCC,
    docs,
    generateDebug,
    limits,
    limitToSring,
    analyze,
    addAnalysis
};
