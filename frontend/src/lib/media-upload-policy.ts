export const IMAGE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const FULL_MEDIA_TYPES = [
  ...IMAGE_MEDIA_TYPES,
  "application/pdf",
  "video/mp4",
  "video/webm",
] as const;

export function demoImagesOnly(): boolean {
  return process.env.NEXT_PUBLIC_MEDIA_DEMO_IMAGES_ONLY === "true";
}

export function acceptedMediaTypes(
  imagesOnly = demoImagesOnly(),
): readonly string[] {
  return imagesOnly ? IMAGE_MEDIA_TYPES : FULL_MEDIA_TYPES;
}

export function mediaTypeGuidance(imagesOnly = demoImagesOnly()): string {
  return imagesOnly
    ? "Choose a JPEG, PNG, or WebP image."
    : "Choose a JPEG, PNG, WebP, PDF, MP4, or WebM file.";
}

export function maximumMediaBytes(
  contentType: string,
  imagesOnly = demoImagesOnly(),
): number {
  if (imagesOnly) return 3 * 1024 * 1024;
  if (contentType === "application/pdf") return 20 * 1024 * 1024;
  if (contentType.startsWith("video/")) return 50 * 1024 * 1024;
  return 25 * 1024 * 1024;
}

export function isExpectedMediaConfirmationStatus(
  value: unknown,
  imagesOnly = demoImagesOnly(),
): boolean {
  return value === "quarantined" || (imagesOnly && value === "approved");
}
