import { Worker } from "bullmq";

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

const worker = new Worker(
  "notifications",
  async (job) => {
    if (job.name === "absence") {
      console.log("absence notification (in-app/FCM later)", job.data);
    }
  },
  { connection: { url } },
);

worker.on("ready", () => console.log("SchoolOS worker listening on notifications"));
worker.on("failed", (job, err) => console.error("job failed", job?.id, err));
