export class QueueService {
  private queues = new Map<string, any[]>();
  
  async addToQueue(queueName: string, job: any): Promise<void> {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }
    this.queues.get(queueName)?.push(job);
  }
  
  async processQueue(queueName: string, handler: (job: any) => Promise<void>): Promise<void> {
    const queue = this.queues.get(queueName) || [];
    while (queue.length > 0) {
      const job = queue.shift();
      await handler(job);
    }
  }
}