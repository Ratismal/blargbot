const BaseCommand = require('../structures/BaseCommand');
const moment = require('moment-timezone');
const reload = require('require-reload')(require);
let patrons, donators;

const startDate = 1444708800000;
var patronStr, donatorStr, pgVal = '?';
async function reloadStrings() {
    ({ patrons, donators } = reload('../../res/donators.json'));
    patronStr = (await Promise.map(patrons, async p => {
        if (/^[0-9]{17,23}$/.test(p)) {
            return bu.getFullName(bot.users.get(p) || (await bu.getCachedUser(p)) || { username: p });
        } else return p;
    })).join('\n - ');
    donatorStr = (await Promise.map(donators, async p => {
        if (/^[0-9]{17,23}$/.test(p)) {
            return bu.getFullName(bot.users.get(p) || (await bu.getCachedUser(p)) || { username: p });
        } else return p;
    })).join('\n - ');
    let pg = (await r.table('vars').get('pg'));
    if (pg) pgVal = pg.value;
    console.log('reloaded');
}
let titan;
let pg;
setInterval(reloadStrings, 60 * 60 * 1000);
reloadStrings();

function pad(value, length) {
    return (value.toString().length < length) ? pad(' ' + value, length) : value;
}

class InfoCommand extends BaseCommand {
    constructor() {
        super({
            name: 'info',
            category: bu.CommandType.GENERAL,
            usage: 'info',
            info: 'Returns some info about me.'
        });
    }

    async execute(msg, words, text) {
        if (!titan) {
            let t = await bot.getRESTUser('135556895086870528');
            titan = bu.getFullName(t);
        }
        if (!pg) {
            let t = await bot.getRESTUser('317592077066305536');
            pg = bu.getFullName(t);
        }
        let age = moment.duration(moment() - moment(startDate));
        let dateStr = `${age.years()} year${age.years() != 1 ? 's' : ''}, ${age.months()} month${age.months() != 1 ? 's' : ''}, ${age.days()} day${age.days() != 1 ? 's' : ''}, ${age.hours()} hour${age.hours() != 1 ? 's' : ''}, ${age.minutes()} minute${age.minutes() != 1 ? 's' : ''}, and ${age.seconds()} second${age.seconds() != 1 ? 's' : ''}`;
        try {
            bu.send(msg, `blargbot is a multipurpose bot with new features implemented regularly, written in javascript using Eris.

:birthday: I am currently ${dateStr} old!

:heart: __**Special thanks to my patrons!**__ :heart:
** - ${patronStr}**

:heart: __**Special thanks to all my other donators!**__ :heart:
** - ${donatorStr}**

Special huge thanks to:
- the awesome **${titan}** for massive contributions to the BBTag system! :tada:
- the amazing **${pg}** for huge financial contributions ($${pgVal})! :tada:

Additional credits to Aurieh#0258! :thumbsup:

For commands, do \`help\`. For information about supporting me, do \`donate\`. For any additional information, such as command documentation, please visit my website: <https://blargbot.xyz>\n\nWant to support the bot? Consider donating to <https://patreon.com/blargbot> - all donations go directly towards recouping hosting costs.`);
        } catch (err) {
            console.error(err);
        }
    }
}

module.exports = InfoCommand;
