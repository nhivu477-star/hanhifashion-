import { realpath, stat, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
export const localImagePattern =
  /^\/(images|uploads)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(webp|avif|jpg|jpeg|png|svg)$/;
async function readLocalImage(url: string) {
  if (!localImagePattern.test(url))
    throw Error("Đường dẫn ảnh nội bộ không hợp lệ.");
  const root = await realpath(path.resolve("public"));
  const file = await realpath(path.join(root, url));
  if (!file.startsWith(root + path.sep))
    throw Error("Ảnh nằm ngoài thư mục cho phép.");
  const info = await stat(file);
  if (!info.isFile() || info.size > 10 * 1024 * 1024 || !info.size)
    throw Error("Tệp ảnh rỗng hoặc quá 10 MB.");
  const bytes = await readFile(file);
  if (url.endsWith(".svg")) {
    // Existing local placeholders only; uploads are always decoded raster WebP.
    const svg = bytes.toString("utf8");
    if (
      !svg.includes("<svg") ||
      /<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|javascript:|data:)/i.test(
        svg,
      )
    )
      throw Error("SVG không an toàn.");
    return { bytes: info.size, format: "svg", width: null, height: null };
  }
  const m = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
  if (
    !["jpeg", "png", "webp", "avif", "heif"].includes(m.format ?? "") ||
    !m.width ||
    !m.height
  )
    throw Error("Nội dung tệp không phải ảnh hợp lệ.");
  const extensions: Record<string, string[]> = {
    jpeg: ["jpg", "jpeg"],
    png: ["png"],
    webp: ["webp"],
    avif: ["avif"],
    heif: ["avif"],
  };
  if (!extensions[m.format!]?.includes(url.split(".").pop()!))
    throw Error("Đuôi tệp không khớp nội dung ảnh.");
  return {
    bytes: info.size,
    format: m.format,
    width: m.width,
    height: m.height,
  };
}

export async function inspectLocalImage(url: string) {
  try {
    return await readLocalImage(url);
  } catch {
    throw Error(
      "Ảnh nội bộ không hợp lệ, không đọc được hoặc vượt giới hạn cho phép.",
    );
  }
}
export async function optimizeUploadedImage(bytes: Buffer) {
  try {
    return await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: 1800,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw Error(
      "Không thể xử lý ảnh. Hãy chọn JPEG, PNG hoặc WebP hợp lệ, tối đa 40 megapixel.",
    );
  }
}
