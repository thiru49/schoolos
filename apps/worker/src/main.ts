import { PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";
const prisma = new PrismaClient();

type AbsenceJob = { schoolId: string; studentId: string; date: string };

async function deliverAbsence(data: AbsenceJob) {
  await prisma.$executeRaw`SELECT set_config('app.school_id', ${data.schoolId}, false)`;
  const parents = await prisma.parentStudent.findMany({
    where: { schoolId: data.schoolId, studentId: data.studentId },
    include: { parent: { include: { user: true } } },
  });
  for (const link of parents) {
    const token = link.parent.user.pushToken;
    if (!token) {
      console.log("FCM skipped (no push token)", link.parent.userId);
      continue;
    }
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          to: token,
          title: "Attendance marked — Absent",
          body: `Absence recorded for ${data.date}`,
          sound: "default",
        }),
      });
      if (!res.ok) console.error("Expo push failed", res.status, await res.text());
    } catch (err) {
      console.error("Expo push error (fail closed)", (err as Error).message);
    }
  }
}

const worker = new Worker(
  "notifications",
  async (job) => {
    if (job.name === "absence") {
      await deliverAbsence(job.data as AbsenceJob);
    }
  },
  { connection: { url } },
);

worker.on("ready", () => console.log("SchoolOS worker listening on notifications"));
worker.on("failed", (job, err) => console.error("job failed", job?.id, err));
