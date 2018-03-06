/*
 * @Author: stupid cat
 * @Date: 2017-05-07 19:34:15
 * @Last Modified by: stupid cat
 * @Last Modified time: 2018-01-26 01:09:00
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const argFactory = require('../structures/ArgumentFactory'),
    af = argFactory;

var e = module.exports = {};

e.processTag = async function (msg, contents, command, tagName, author, isCcommand) {
    let result = { contents, reactions: [] };
    try {
        author = author || msg.channel.guild.id;
        var words = typeof command === 'string' ? bu.splitInput(command) : command;

        if (contents.toLowerCase().indexOf('{nsfw') > -1) {
            let nsfwChan = await bu.isNsfwChannel(msg.channel.id);
            if (!nsfwChan) {
                bu.send(msg, `❌ This tag contains NSFW content! Go to an NSFW channel. ❌`);
                return;
            }
        }

        if (contents.split(' ')[0].indexOf('help') > -1) {
            contents = '\u200B' + contents;
        }
        contents = contents.replace(new RegExp(bu.specialCharBegin, 'g'), '').replace(new RegExp(bu.specialCharDiv, 'g'), '').replace(new RegExp(bu.specialCharEnd, 'g'), '');

        result = await bu.processTag({
            msg,
            words,
            contents,
            author,
            tagName,
            ccommand: isCcommand
        });
        result.contents = bu.processSpecial(result.contents, true);
    } catch (err) {
        console.error(err);
    }
    return result;
};

e.executeTag = async function (msg, tagName, command) {
    let tag = await r.table('tag').get(tagName).run();
    if (!tag)
        bu.send(msg, `❌ That tag doesn't exist! ❌`);
    else {
        if (tag.deleted === true) {
            await bu.send(msg, `❌ That tag has been permanently deleted by **${bu.getFullName(bot.users.get(tag.deleter))}**

Reason: ${tag.reason}`);
            return;
        }
        if (tag.content.toLowerCase().indexOf('{nsfw') > -1) {
            let nsfwChan = await bu.isNsfwChannel(msg.channel.id);
            if (!nsfwChan) {
                bu.send(msg, `❌ This command contains NSFW content! Go to an NSFW channel. ❌`);
                return;
            }
        }
        r.table('tag').get(tagName).update({
            uses: tag.uses + 1,
            lastuse: r.now()
        }).run();
        var output = await e.processTag(msg, tag.content, command, tagName, tag.author);
        while (/<@!?[0-9]{17,21}>/.test(output.contents)) {
            let match = output.contents.match(/<@!?([0-9]{17,21})>/)[1];
            console.debug(match);
            let obtainedUser = await bu.getUser(msg, match, true);
            let name = '';
            if (obtainedUser) {
                name = `@${obtainedUser.username}#${obtainedUser.discriminator}`;
            } else {
                name = `@${match}`;
            }
            output.contents = output.contents.replace(new RegExp(`<@!?${match}>`, 'g'), name);
        }
        if (output.contents == '')
            return;
        let message = bu.send(msg, output.contents);
        await bu.addReactions(message.channel.id, message.id, output.reactions);
    }
};

e.docs = async function (msg, command, topic, ccommand = false) {
    let help = CommandManager.list['help'],
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

    if (!ccommand)
        tags = tags.filter(t => t.category != bu.TagType.CCOMMAND);

    switch (words[0]) {
        case 'index':
            embed.description = 'Please use `' + prefix + command + ' docs [topic]` to view available information on a topic\nAvailable topics are:';
            embed.fields = Object.keys(bu.TagType.properties)
                .map(k => {
                    return {
                        properties: bu.TagType.properties[k],
                        tags: tags.filter(t => t.category == k)
                    };
                }).filter(c => c.tags.length > 0)
                .map(c => {
                    return {
                        name: c.properties.name + ' subtags - ' + c.properties.desc,
                        value: '```\n' + c.tags.map(t => t.name).join(', ') + '```'
                    };
                }).concat({
                    name: 'Other useful topics',
                    value: '```\nvariables, argTypes, terminology```'
                }).filter(f => f.value.length > 0);
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
                Argument: 'An argument is a single value which gets given to a subtag. Arguments can be numbers, text, arrays, anything you can type really. '+
                    'Each subtag will require a different argument pattern, so be sure to check what pattern your subtag needs!',
                Variable: 'A variable is a value that is stored in the bots memory ready to access it later on. '+
                    'For more in-depth details about variables, please use `' + prefix + command + ' docs variable`.',
                Array: 'An array is a collection of values all grouped together, commonly done so by enclosing them inside `[]`. '+
                    'In BBTag, arrays can be assigned to a variable to store them for later use. In this situation, you might ' +
                    'see an array displayed like this `{"v":["1","2","3"],"n":"varname"}`. If you do, dont worry, nothing is broken! '+
                    'That is just there to allow ' + bot.user.username + ' to modify the array in place within certain subtags.'
            };
            embed.title += ' - Terminology';

            let term = Object.keys(terms).filter(k => k.toLowerCase() == (words[1] || '').toLowerCase())[0];
            if (term != null) {
                embed.title += ' - ' + term;
                embed.description = terms[term];
                return await help.sendHelp(msg, { embed }, 'BBTag documentation');
            }

            embed.description = 'There are various terms used in BBTag that might not be intuitive, '+
            'so here is a list of definitions for some of the most important ones:\n\u200B';
            embed.fields = Object.keys(terms).map(k => {
                return {
                    name: k,
                    value: terms[k] + '\n\u200B'
                };
            });
            return await help.sendHelp(msg, { embed }, 'BBTag documentation');
        default:
            let tag = tags.filter(t => t.name == topic.toLowerCase())[0];
            if (tag == null)
                break;
            let category = bu.TagType.properties[tag.category];
            embed.description = tag.desc;
            embed.title += ' - ' + tag.name[0].toUpperCase() + tag.name.substring(1);
            embed.url += '/#' + encodeURIComponent(tag.name);
            embed.fields = [
                {
                    name: 'Category',
                    value: category.name + ' - ' + category.desc
                },
                {
                    name: 'Usage',
                    value: '```\n{' + [tag.name, argFactory.toString(tag.args, argsOptions)].filter(t => t.length > 0).join(';') + '}```'
                }
            ];
            if (tag.exampleCode)
                embed.fields.push({
                    name: 'Example code',
                    value: '```\n\u200B' + tag.exampleCode + '\u200B```'
                });
            if (tag.exampleIn)
                embed.fields.push({
                    name: 'Example user input',
                    value: '```\n\u200B' + tag.exampleIn + '\u200B```'
                });
            if (tag.exampleOut)
                embed.fields.push({
                    name: 'Example output',
                    value: '```\n\u200B' + tag.exampleOut + '\u200B```'
                });
            return await help.sendHelp(msg, { embed }, 'BBTag documentation', true);

    }

    return await bu.send(msg, 'Oops, I didnt recognise that topic! Try using `' + prefix + command + ' docs` for a list of all topics');
};