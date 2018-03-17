/*
 * @Author: stupid cat
 * @Date: 2018-02-07 18:30:33
 * @Last Modified by: stupid cat
 * @Last Modified time: 2018-02-24 15:16:21
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

var e = module.exports = {};

e.init = () => {
    e.category = bu.TagType.COMPLEX;
};

e.requireCtx = require;

e.isTag = true;
e.name = `tagexists`;
e.args = `&lt;tagName&gt;`;
e.usage = `{tagexists;tagName}`;
e.desc = `Checks to see if the given subtag exists (system subtags, not usertags)`;
e.exampleIn = `{tagexists;ban} {tagexists;AllenKey}`;
e.exampleOut = `true false`;

e.execute = async function (params) {
    let replaceString = '', replaceContent = false;
    if (params.args.length == 2) {
        let tagName = await bu.processTagInner(params, 1);
        replaceString = (TagManager.list[tagName.toLowerCase()] != undefined).toString();
    } else if (params.args.length > 2) {
        replaceString = await bu.tagProcessError(params, '`Too many arguments`');
    } else {
        replaceString = await bu.tagProcessError(params, '`Not enough arguments`');
    }

    return {
        terminate: params.terminate,
        replaceString: replaceString,
        replaceContent: replaceContent
    };
};
