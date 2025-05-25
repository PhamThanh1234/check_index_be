import { exiftool } from 'exiftool-vendored';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import sharp from 'sharp';
import fileType from 'file-type';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export interface ImageMetadata {
  latitude?: number;
  longitude?: number;
  title?: string;
  subject?: string;
  keywords?: string;
  copyright?: string;
  author?: string;
  rating?: number;
  dateTaken?: string;
  comment?: string;
}

const validateCoordinates = (lat?: number, lon?: number): void => {
  if (lat !== undefined && (lat < -90 || lat > 90)) {
    throw new Error(`Invalid latitude value: ${lat}`);
  }
  if (lon !== undefined && (lon < -180 || lon > 180)) {
    throw new Error(`Invalid longitude value: ${lon}`);
  }
};

const formatExifDate = (dateStr?: string): string | undefined => {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return undefined;
  return `${d.getFullYear()}:${String(d.getMonth() + 1).padStart(2, '0')}:${String(d.getDate()).padStart(2, '0')} ` +
         `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

export async function setMetadata(filePath: string, metadata: ImageMetadata): Promise<void> {
  // Validate GPS coordinate range
  if (metadata.latitude !== undefined && (metadata.latitude < -90 || metadata.latitude > 90))
    throw new Error('Invalid latitude');
  if (metadata.longitude !== undefined && (metadata.longitude < -180 || metadata.longitude > 180))
    throw new Error('Invalid longitude');

  // Prepare EXIF fields, lọc bỏ undefined
  const exifData = Object.fromEntries(
    Object.entries({
      GPSLatitude: metadata.latitude,
      GPSLatitudeRef: metadata.latitude !== undefined ? (metadata.latitude >= 0 ? 'N' : 'S') : undefined,
      GPSLongitude: metadata.longitude,
      GPSLongitudeRef: metadata.longitude !== undefined ? (metadata.longitude >= 0 ? 'E' : 'W') : undefined,
      Title: metadata.title,
      Subject: metadata.subject,
      Keywords: metadata.keywords,
      Copyright: metadata.copyright,
      Artist: metadata.author,
      Rating: metadata.rating,
      DateTimeOriginal: formatExifDate(metadata.dateTaken),
      Comment: metadata.comment
    }).filter(([_, v]) => v !== undefined && v !== null)
  );

  await exiftool.write(filePath, exifData);
}

export const processImageWithMetadata = async (
  buffer: Buffer,
  metadata: ImageMetadata,
  originalFilename?: string
): Promise<Buffer> => {
  const type = await fileType.fromBuffer(buffer);

  // Kiểm tra type.ext tồn tại và hợp lệ
  if (!type?.ext || !['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(type.ext)) {
    throw new Error('Unsupported image format');
  }

  const ext = type.ext as string; // Đảm bảo ext là string hợp lệ
  const jpegBuffer = (ext === 'jpg' || ext === 'jpeg')
    ? buffer
    : await sharp(buffer).jpeg({ quality: 90 }).toBuffer();

  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const safeFilename = originalFilename?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'image';
  const filename = `temp_${Date.now()}_${safeFilename}.jpg`;
  const tempFilePath = path.join(tempDir, filename);

  try {
    await writeFile(tempFilePath, jpegBuffer);
    await setMetadata(tempFilePath, metadata);
    return await fs.promises.readFile(tempFilePath);
  } finally {
    await unlink(tempFilePath).catch(() => {});
  }
};
