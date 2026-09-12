import { Injectable, Logger } from "@nestjs/common";
import { Client } from "minio";

@Injectable()
export class FilesService {
  private readonly log = new Logger(FilesService.name);

  private client() {
    return new Client({
      endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY ?? "schoolos",
      secretKey: process.env.MINIO_SECRET_KEY ?? "schoolos-minio",
    });
  }

  async uploadLogo(schoolId: string, buffer: Buffer, mime: string, filename: string) {
    const bucket = process.env.MINIO_BUCKET ?? "schoolos";
    const client = this.client();
    const exists = await client.bucketExists(bucket).catch(() => false);
    if (!exists) await client.makeBucket(bucket);
    const objectName = `tenants/${schoolId}/logo/${filename}`;
    await client.putObject(bucket, objectName, buffer, buffer.length, { "Content-Type": mime });
    const port = process.env.MINIO_PORT ?? "9000";
    const host = process.env.MINIO_ENDPOINT ?? "localhost";
    const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
    return `${protocol}://${host}:${port}/${bucket}/${objectName}`;
  }
}
