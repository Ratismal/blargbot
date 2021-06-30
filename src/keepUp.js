/*
 * @Author: stupid cat
 * @Date: 2017-05-07 19:32:02
 * @Last Modified by: stupid cat
 * @Last Modified time: 2017-11-29 13:22:34
 *
 * This project uses the AGPLv3 license. Please read the license file before using/adapting any of the code.
 */

/**
 * This will restart the bot on the event that its thread blocks
 */

const childProcess = require('child_process');
const path = require('path');
const config = require('./config');
const Eris = require('eris');
const client = new Eris.Client(config.discord.token);

var child;
var missed = 0;
var last;

function spawn() {
    child = childProcess.fork(path.join(__dirname, 'blargbot.js'));

    child.on('message', msg => {
        if (msg.code == 'PONG' && msg.stamp == last) {
            missed = 0;
            last = '';
        }
    });

    child.on('exit', (code, signal) => {
        if (code == 0) {
            process.exit();
        } else {
            spawn();
        }
    });
}

spawn();
setInterval(function () {
    if (last != '') {
        console.error('Missed a ping!');
        if (++missed == 5) {
            child.kill('SIGKILL');
            client.executeWebhook(config.emerg.id, config.emerg.token, {
                content: 'Restarted the thread after 5 missed pings.'
            });
        }
    }
    last = Date.now();
    child.send({
        code: 'PING',
        stamp: last
    });
}, 10 * 1000);