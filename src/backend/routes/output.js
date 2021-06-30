/*
 * @Author: stupid cat
 * @Date: 2017-05-07 18:19:10
 * @Last Modified by: stupid cat
 * @Last Modified time: 2019-01-02 14:18:24
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

const router = require('express').Router();
const showdown = require('showdown');
require('../highlight.js');

const converter = new showdown.Converter({ extensions: ['codehighlight'] });
converter.setFlavor('github');
converter.setOption('disableForced4SpacesIndentedSublists', true);
const xss = require('xss');
const hbs = require('hbs');
const moment = require('moment-timezone');



async function getOutput(id) {
    if (!bu.cclient) {
        return {
            id: 1,
            content: 'Hello, world!',
            embeds: [],
            channelid: 1,
            expiry: 0
        };
    }
    let m = await bu.cclient.execute(`SELECT id, content, embeds, channelid, TTL(content) as expiry FROM message_outputs WHERE id = :id`, {
        id
    }, { prepare: true });

    return m.rows[0];
}

router.get('/:id/raw', async function (req, res) {
    let id = req.params.id.split('.');
    let output = await getOutput(id[0]);
    res.set('content-type', 'text/plain');
    res.send(output.content);
});

let whiteList = xss.whiteList;
whiteList.marquee = ['behavior', 'direction', 'hspace', 'loop', 'scrollamount', 'scrolldelay', 'truespeed', 'vspace']; // Allow marquees
whiteList.style = []; // Allow style without attributes
whiteList.link = ['rel', 'href']; // Allow link tags for external CSS.

// add class and id attributes to all whitelisted elements
for (const key in whiteList) {
    whiteList[key].push('class', 'id');
}


router.get('/:id', async function (req, res) {
    res.locals.user = req.user;

    let id = req.params.id.split('.');

    let output = await getOutput(id[0]);

    if (id[1] === 'txt') {
        res.set('content-type', 'text/plain');
        res.end(output.content, 'utf8');
    } else {
        if (output.expiry > 0) {
            let date = moment(bu.unmakeSnowflake(output.id)).add(output.expiry, 'seconds');
            let diff = moment.duration(-1 * (moment() - date));
            output.expiry = date.tz('etc/utc').format('MMMM Do, YYYY');
            output.diff = diff.humanize(true);
        } else {
            output.expiry = 'never';
            output.diff = 'never';
        }
        if (output.content) {
            console.log(output.content);
            let html = converter.makeHtml(output.content);
            html = xss(html, {
                whiteList
            });
            output.content = html;
        }

        res.locals.msg = output;
        res.render('output');
    }
});

router.get('/:id/perm', async function (req, res) {
    res.locals.user = req.user;

    if (!req.user || req.user.id !== '103347843934212096') {
        res.status(401);
        res.send('You do not have permission to do this.');
        return;
    }

    let id = req.params.id.split('.');

    let output = await getOutput(id[0]);

    let m = await bu.cclient.execute(`UPDATE message_outputs USING TTL 0 
        SET content = :content, embeds = :embeds, channelid = :channelid
    WHERE id = :id`, {
            id: output.id, content: output.content, embeds: output.embeds, channelid: output.channelid
        }, { prepare: true });

    res.send('ok');
});

module.exports = router;