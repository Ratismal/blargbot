const EventEmitter = require('eventemitter3');

class Sender extends EventEmitter {
    constructor(client, proc) {
        super();
        this.client = client;
        if (proc)
            this.process = proc;
    }

    send(code, data) {
        if (!data) {
            data = code;
            code = 'generic';
        }
        if (!(data instanceof Object))
            data = {
                message: data,
                shard: parseInt(this.process.env.CLUSTER_ID)
            };
        const message = {
            code, data
        };
        return new Promise((fulfill, reject) => {
            const didSend = this.process.send(JSON.stringify(message), err => {
                if (!err) fulfill();
                else {
                    console.error(err);
                    if (!this.process.connected) this.process.kill();
                    reject(err);
                }
            });
            // if (message.code !== 'log' && !didSend) {
            //     console.error('Shard failed to send message.\n  Connected: ' + this.process.connected + '\n  Code: ' + message.code + '\n   Message: ' + JSON.stringify(message).substring(0, 200));
            //     if (!this.process.connected) this.process.exit();
            //     reject(Error('Shard failed to send message'));
            // }
        });
    }

    awaitMessage(data) {
        if (!(data instanceof Object))
            data = {
                message: data
            };
        return new Promise((fulfill, reject) => {
            data.key = Date.now().toString();
            let event = 'await:' + data.key;
            this.send('await', data);
            let timer = setTimeout(() => {
                this.process.removeAllListeners(event);
                reject(new Error('Rejected message after 60 seconds: '
                    + data.message.substring(0, 16)
                    + (this.process.env ? ' (' + this.process.env.CLUSTER_ID + ')' : '')));
            }, 60000);
            this.once(event, data => {
                clearTimeout(timer);
                fulfill(data);
            });
        });
    }
}

module.exports = Sender;