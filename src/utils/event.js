class EventManager {
  constructor() {
    this.cache = {};
  }

  async insert(event) {
    const res = await r.table('events').insert(event, {
      returnChanges: true
    });

    if (res.changes) {
      const val = res.changes[0].new_val;
      if (Date.now() - +val.endtime <= 1000 * 60 * 5) {
        this.cache[val.id] = val;
      }
    }
  }

  isEventRelevant(event) {
    return !((event.channel && !bot.getChannel(event.channel))
      || (event.guild && !bot.guilds.get(event.guild))
      || (!event.channel && !event.guild && event.user && process.env.CLUSTER_ID != 0)
      || (event.type === 'purgelogs'));
  }

  async process() {
    const events = Object.values(this.cache).filter(e => +e.endtime <= Date.now());

    for (const event of events) {
      if (!this.isEventRelevant(event)) {
        delete this.cache[event.id];
        continue;
      }

      let type = event.type;
      try {
        if (CommandManager.built[type]) {
          CommandManager.built[type].event(event);
        }
      } catch (err) {
        console.error('Event failed to execute:', err.message);
      } finally {
        await this.delete(event.id);
      }
    }
  }

  async delete(id) {
    delete this.cache[id];
    await r.table('events').get(id).delete();
  }

  async deleteFilter(filter) {
    const res = await r.table('events').filter(filter).delete({
      returnChanges: true
    }).run();

    if (res.changes) {
      for (const change of res.changes) {
        delete this.cache[change.old_val.id];
      }
    }
  }

  async obtain() {
    let events = await r.table('events').between(r.epochTime(0), r.epochTime(Date.now() / 1000 + 60 * 5), {
      index: 'endtime'
    });

    for (const event of events) {
      if (this.isEventRelevant(event)) {
        this.cache[event.id] = event;
      }
    }
  }
}

bu.events = new EventManager();