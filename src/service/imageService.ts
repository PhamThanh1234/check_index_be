import sharp from "sharp";
import piexif from "piexifjs";

function degToDmsRational(deg: number) {
  deg = Math.abs(deg);
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  const s = (deg - d - m / 60) * 3600;
  return [
    [d, 1],
    [m, 1],
    [Math.round(s * 100), 100],
  ];
}

async function normalizeJpeg(inputBuffer: Buffer): Promise<Buffer> {
  return await sharp(inputBuffer)
    .jpeg({ quality: 90, progressive: false })
    .toBuffer();
}

export async function geotagJpegImage(
  inputBuffer: Buffer,
  geoData: {
    latitude: number;
    longitude: number;
    title?: string;
    author?: string;
    copyright?: string;
    dateTaken?: string; // ISO string hoặc chuỗi ngày
  }
): Promise<Buffer> {
  // Normalize ảnh để tránh progressive jpeg hoặc không chuẩn
  const normalizedBuffer = await normalizeJpeg(inputBuffer);

  // Chuyển Buffer sang chuỗi binary để piexifjs xử lý
  const jpegBinaryStr = normalizedBuffer.toString("binary");

  // Load exif nếu có hoặc tạo mới
  let exifObj: any;
  try {
    exifObj = piexif.load(jpegBinaryStr);
  } catch {
    exifObj = { "0th": {}, "Exif": {}, "GPS": {}, "1st": {}, thumbnail: null };
  }

  const { latitude, longitude, title, author, copyright, dateTaken } = geoData;

  // GPS Tags
  exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latitude >= 0 ? "N" : "S";
  exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = degToDmsRational(latitude);
  exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = longitude >= 0 ? "E" : "W";
  exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = degToDmsRational(longitude);

  // 0th IFD - các trường cơ bản
  if (title) {
    exifObj["0th"][piexif.ImageIFD.ImageDescription] = title;
  }
  if (author) {
    exifObj["0th"][piexif.ImageIFD.Artist] = author;
  }
  if (copyright) {
    exifObj["0th"][piexif.ImageIFD.Copyright] = copyright;
  }

  // Exif IFD - ngày chụp
  if (dateTaken) {
    const d = new Date(dateTaken);
    const formattedDate = `${d.getFullYear()}:${String(d.getMonth() + 1).padStart(2, "0")}:${String(
      d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(
      d.getSeconds()
    ).padStart(2, "0")}`;

    exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = formattedDate;
    exifObj["0th"][piexif.ImageIFD.DateTime] = formattedDate;
  }

  // Dump lại exif
  const exifBytes = piexif.dump(exifObj);

  // Chèn exif vào ảnh
  const newData = piexif.insert(exifBytes, jpegBinaryStr);

  // Trả về buffer
  return Buffer.from(newData, "binary");
}
