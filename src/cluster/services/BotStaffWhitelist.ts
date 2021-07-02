import { IntervalService } from '../../structures/IntervalService';
import { Cluster } from '../Cluster';

export class BotStaffWhitelistInterval extends IntervalService {
    public readonly type: string = 'bot';

    public constructor(private readonly cluster: Cluster) {
        super(1, 'day', cluster.logger, true);
    }

    protected async execute(): Promise<void> {
        await this.cluster.botStaff.refresh();
    }
}
