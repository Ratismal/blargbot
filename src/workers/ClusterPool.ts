import { ClusterConnection } from './ClusterConnection';
import { WorkerPool } from './core/WorkerPool';

export interface ClusterPoolOptions {
    worker?: string;
}

export class ClusterPool extends WorkerPool<ClusterConnection> {
    public constructor(
        public readonly config: Configuration['shards'],
        logger: CatLogger
    ) {
        super('Cluster',
            Math.ceil(config.max / config.perCluster),
            /*config.spawnTime*/999999999,
            logger);
    }

    protected createWorker(id: number): ClusterConnection {
        const cluster = new ClusterConnection(
            id,
            this.shardRange(id),
            this.config.max,
            this.logger
        );
        return cluster;
    }

    public shardRange(clusterId: number): [firstShard: number, lastShard: number] {
        if (clusterId >= this.workerCount)
            throw new Error(`Cluster ${clusterId} doesnt exist`);

        const perCluster = this.config.perCluster;
        const firstShard = clusterId * perCluster;
        const lastShard = Math.min(firstShard + perCluster, this.config.max) - 1;
        return [firstShard, lastShard];
    }
}