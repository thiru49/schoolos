import { PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";
const prisma = new PrismaClient();

type AbsenceJob = { schoolId: string; studentId: string; date: string };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendExpoPush(token: string, title: string, body: string) {
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: "default",
    }),
  });
  if (!res.ok) {
    throw new Error(`Expo push failed ${res.status} ${await res.text()}`);
  }
  const payload = (await res.json()) as { data?: { status?: string; message?: string } };
  if (payload.data?.status === "error") {
    throw new Error(payload.data.message ?? "Expo push rejected");
  }
}

async function deliverAbsence(data: AbsenceJob) {
  const parents = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.school_id', ${data.schoolId}, true)`;
    return tx.parentStudent.findMany({
      where: { schoolId: data.schoolId, studentId: data.studentId },
      include: { parent: { include: { user: true } } },
    });
  });

  const tokens = parents
    .map((link) => link.parent.user.pushToken)
    .filter((token): token is string => Boolean(token));

  if (tokens.length === 0) {
    console.log("Expo push skipped (no push token)", data.studentId);
    return;
  }

  await Promise.all(
    tokens.map((token) =>
      sendExpoPush(token, "Attendance marked — Absent", `Absence recorded for ${data.date}`),
    ),
  );
}

const worker = new Worker(
  "notifications",
  async (job) => {
    if (job.name === "absence") {
      await deliverAbsence(job.data as AbsenceJob);
    }
  },
  {
    connection: { url },
    autorun: true,
  },
);

worker.on("ready", () => console.log("SchoolOS worker listening on notifications"));
worker.on("failed", (job, err) => console.error("job failed", job?.id, err));
