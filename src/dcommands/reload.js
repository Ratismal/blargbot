const BaseCommand = require('../structures/BaseCommand');
const newbutils = require('../newbu');

class ReloadCommand extends BaseCommand {
    constructor() {
        super({
            name: 'reload',
            category: newbutils.commandTypes.CAT
        });
    }

    async execute(msg, words, text) {
        if (msg.author.id === bu.CAT_ID) {
            bu.emitter.emit('reloadConfig');
            bu.send(msg, ':ok_hand:');
        }
    }
}

module.exports = ReloadCommand;
