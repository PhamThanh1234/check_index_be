import { FastifyRequest, FastifyReply } from "fastify";
import path from "path";
import os from "os";
import fs from "fs";
import { pipeline } from "stream/promises";
import { randomUUID } from "crypto";

import { geotagJpegImage } from "../../service/imageService";

export const geotagImageHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const parts = req.parts();

  let file: any = null;
  const metadata: Record<string, any> = {};

  try {
    for await (const part of parts) {
      if (part.type === "file") {
        file = part;
      } else if (part.type === "field") {
        metadata[part.fieldname] = part.value;
      }
    }

    if (!file) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    // Kiểm tra file jpeg
    if (!/\.(jpe?g)$/i.test(file.filename)) {
      return reply.status(400).send({ error: "Only JPEG images are supported" });
    }

    // Lưu file tạm
    const tempDir = path.join(os.tmpdir(), "uploads");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempFilePath = path.join(tempDir, `${randomUUID()}_${file.filename}`);
    const writeStream = fs.createWriteStream(tempFilePath);
    await pipeline(file.file, writeStream);

    const inputBuffer = await fs.promises.readFile(tempFilePath);

    const latitude = parseFloat(metadata.latitude);
    const longitude = parseFloat(metadata.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      return reply.status(400).send({ error: "Invalid or missing latitude/longitude" });
    }

    const title = metadata.title || "";
    const author = metadata.author || "";
    const copyright = metadata.copyright || "";
    const dateTaken = metadata.dateTaken || "";

    const outputBuffer = await geotagJpegImage(inputBuffer, {
      latitude,
      longitude,
      title,
      author,
      copyright,
      dateTaken,
    });

    // Xóa file tạm
    await fs.promises.unlink(tempFilePath);

    reply
      .header("Content-Type", "image/jpeg")
      .header("Content-Disposition", `attachment; filename="geotagged-${file.filename}"`)
      .send(outputBuffer);
  } catch (error) {
    reply.status(500).send({
      error: "Processing failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
