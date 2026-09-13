import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";
import { classifyExpoPushResponse } from "./expo-push";
import { renderReportCardPdf, type ReportCardPayload } from "./report-card-pdf";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";
const prisma = new PrismaClient();

type AbsenceJob = { schoolId: string; studentId: string; date: string };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function clearStalePushToken(schoolId: string, token: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.school_id', ${schoolId}, true)`;
    await tx.user.updateMany({
      where: { schoolId, pushToken: token },
      data: { pushToken: null },
    });
  });
}

async function sendExpoPush(schoolId: string, token: string, title: string, body: string) {
  let res: Response;
  try {
    res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: "default",
      }),
    });
  } catch (err) {
    throw new Error(`Expo push network error: ${(err as Error).message}`);
  }

  let payload: unknown = {};
  try {
    payload = await res.json();
  } catch {
    payload = { message: await res.text().catch(() => "") };
  }

  const outcome = classifyExpoPushResponse(res.status, payload);
  if (outcome.unregister) {
    await clearStalePushToken(schoolId, token);
    console.log("Expo push token cleared (DeviceNotRegistered)");
    return;
  }
  if (!outcome.ok && outcome.retry) {
    throw new Error(outcome.message);
  }
  if (!outcome.ok) {
    console.error("Expo push failed closed", outcome.message);
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

  for (const token of tokens) {
    await sendExpoPush(
      data.schoolId,
      token,
      "Attendance marked — Absent",
      `Absence recorded for ${data.date}`,
    );
  }
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

const pdfWorker = new Worker(
  "pdf",
  async (job) => {
    if (job.name !== "report-card") return;
    const data = job.data as { schoolId: string; studentId: string; payload: ReportCardPayload };
    const dir = process.env.PDF_DIR ?? path.join(os.tmpdir(), "schoolos-pdfs");
    await fs.mkdir(dir, { recursive: true });
    const buf = await renderReportCardPdf(data.payload);
    await fs.writeFile(path.join(dir, `${data.schoolId}-${data.studentId}.pdf`), buf);
  },
  { connection: { url }, autorun: true },
);
pdfWorker.on("ready", () => console.log("SchoolOS worker listening on pdf"));
pdfWorker.on("failed", (job, err) => console.error("pdf job failed", job?.id, err));
