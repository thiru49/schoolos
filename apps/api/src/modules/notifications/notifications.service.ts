import { Injectable, Logger, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import { pushTokenSchema } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly log = new Logger(NotificationsService.name);
  private queue: Queue | null = null;

  constructor(private readonly prisma: PrismaService) {}

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

  async listMine(acl: RequestAcl) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const rows = await tx.inboxNotification.findMany({
        where: { schoolId: acl.schoolId, userId: acl.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        read: Boolean(r.readAt),
        createdAt: r.createdAt.toISOString(),
      }));
    });
  }

  async markRead(acl: RequestAcl, id: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const row = await tx.inboxNotification.findFirst({
        where: { id, schoolId: acl.schoolId, userId: acl.userId },
      });
      if (!row) throw new NotFoundException("Notification not found");
      await tx.inboxNotification.update({
        where: { id: row.id },
        data: { readAt: new Date() },
      });
      return { id: row.id, read: true };
    });
  }

  async savePushToken(acl: RequestAcl, body: unknown) {
    const input = pushTokenSchema.parse(body);
    await this.prisma.withSchool(acl.schoolId, async (tx) => {
      await tx.user.update({
        where: { id: acl.userId },
        data: { pushToken: input.token },
      });
    });
    return { saved: true };
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }
}
