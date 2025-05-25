import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile, MultipartValue } from '@fastify/multipart';
import { processImageWithMetadata, ImageMetadata } from '../../service/metadataService';
import { pipeline } from 'stream/promises';
import { exiftool } from 'exiftool-vendored';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createWriteStream, unlinkSync } from 'fs';
import { setMetadata } from '../../service/metadataService';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const parseMetadataFromRequest = (metadata: Record<string, any>): ImageMetadata => {
  return {
    latitude: metadata.latitude ? parseFloat(metadata.latitude) : undefined,
    longitude: metadata.longitude ? parseFloat(metadata.longitude) : undefined,
    title: metadata.title,
    subject: metadata.subject,
    keywords: metadata.keywords?.split(',').map((k: string) => k.trim()),
    copyright: metadata.copyright,
    author: metadata.author,
    rating: metadata.rating ? parseInt(metadata.rating) : undefined,
    dateTaken: metadata.dateTaken,
    comment: metadata.comment,
  };
};


export const setMetadataHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  req.log.info('Start processing metadata');

  const timeout = setTimeout(() => {
    req.log.warn('Request timeout');
    if (!reply.sent) {
      reply.status(504).send({ error: 'Request timeout' });
    }
  }, 60000);

  let tempFilePath: string | null = null;
  let responded = false;

  try {
    const parts = req.parts();
    let file: MultipartFile | null = null;
    const metadata: Record<string, any> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        file = part;
        metadata.title = metadata.title || path.parse(file.filename).name;
      } else if (part.type === 'field') {
        metadata[part.fieldname] = part.value;
      }
    }

    if (!file) {
      if (!responded) {
        responded = true;
        return reply.status(400).send({ error: 'No file uploaded' });
      }
    }

    const parsedMetadata = parseMetadataFromRequest(metadata);
    const tempDir = path.join(os.tmpdir(), 'uploads');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // file chắc chắn không null ở đây
    const ext = path.extname(file.filename) || '.jpg';
    tempFilePath = path.join(tempDir, `${randomUUID()}${ext}`);

    const writeStream = fs.createWriteStream(tempFilePath);
    await pipeline(file.file, writeStream);

    req.log.info(`Saved uploaded file to ${tempFilePath}`);

    const buffer = await fs.promises.readFile(tempFilePath);
    req.log.info(`Read file buffer, size: ${buffer.length} bytes`);

    // Giới hạn timeout xử lý ảnh riêng biệt (ví dụ 30s)
    const processPromise = processImageWithMetadata(buffer, parsedMetadata, file.filename);

    const processed = await Promise.race([
      processPromise,
      new Promise<Buffer>((_, reject) =>
        setTimeout(() => reject(new Error('Image processing timeout')), 30000)
      ),
    ]);

    if (!responded) {
      responded = true;
      return reply
        .header('Content-Type', 'image/jpeg')
        .header('Content-Disposition', `attachment; filename="geotagged-${path.parse(file.filename).name}.jpg"`)
        .send(processed);
    }
  } catch (err) {
    req.log.error(err);
    if (!responded) {
      responded = true;
      return reply.status(500).send({
        error: 'Processing failed',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  } finally {
    clearTimeout(timeout);
    if (tempFilePath) {
      fs.promises.unlink(tempFilePath).catch(e => req.log.error('Temp cleanup failed', e));
    }
  }
};


export async function setMetadataHandler1(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parts = req.parts();

  let file: MultipartFile | null = null;
  let metadata: any = null;

  for await (const part of parts) {
    if (part.type === 'file') {
      file = part;
    } else if (part.type === 'field' && part.fieldname === 'metadata') {
      try {
        metadata = JSON.parse(part.value as string);
      } catch (error) {
        return reply.status(400).send({ error: 'Invalid metadata JSON' });
      }
    }
  }

  if (!file || !metadata) {
    return reply.status(400).send({ error: 'Missing file or metadata' });
  }

  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `${randomUUID()}-${file.filename}`);

  const writeStream = createWriteStream(tempFilePath);

  await new Promise<void>((resolve, reject) => {
    file.file.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    file.file.on('error', reject);
  });

  try {
    await setMetadata(tempFilePath, metadata);
  } catch (err) {
    unlinkSync(tempFilePath);
    return reply.status(500).send({ error: 'Failed to write metadata' });
  }

  const imageBuffer = await fs.promises.readFile(tempFilePath);
  unlinkSync(tempFilePath);

  reply
    .header('Content-Type', 'image/png')
     // hoặc 'image/png' nếu xử lý PNG
    .header('Content-Disposition', `attachment; filename="geotagged-${file.filename}"`)
    .send(imageBuffer);
}
