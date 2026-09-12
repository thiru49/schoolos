import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";

@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly log = new Logger(NotificationsService.name);
  private queue: Queue | null = null;

  private getQueue() {
    if (this.queue) return this.queue;
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.queue = new Queue("notifications", { connection: { url } });
    return this.queue;
  }

  async enqueueAbsence(payload: { schoolId: string; studentId: string; date: string }) {
    try {
      await this.getQueue().add("absence", payload, { removeOnComplete: true });
    } catch (err) {
      this.log.warn(`Absence enqueue skipped: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }
}
