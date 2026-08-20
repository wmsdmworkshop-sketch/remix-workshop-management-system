/**
 * Utility functions for robust client-side image processing, compression,
 * and safe handling in mobile WebViews (Capacitor Android/iOS & Web) and Node test environments.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: string;
}

/**
 * Compresses an image File or Blob using HTML5 Canvas or ImageBitmap to prevent
 * Out-Of-Memory (OOM) errors and 413 Payload Too Large errors in Android WebViews.
 *
 * Optimized for low-memory devices by using createImageBitmap if available and
 * avoiding high-resolution fallbacks.
 */
export async function compressImageFile(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.8,
    mimeType = "image/jpeg"
  } = options;

  // Node.js test environment fallback
  if (typeof window === "undefined" || typeof document === "undefined") {
    if (typeof (file as any).arrayBuffer === "function") {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return `data:${file.type || mimeType};base64,${base64}`;
    }
    return "";
  }

  // Helper for safe Base64 fallback (only for reasonably sized images)
  const safeFallback = async (f: File | Blob): Promise<string> => {
    if (f.size > 2 * 1024 * 1024) { // 2MB limit for raw Base64 fallback
        console.warn("Image too large for fallback, rejecting to prevent crash");
        throw new Error("IMAGE_TOO_LARGE_FOR_MEMORY");
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  };

  // 1. Try modern createImageBitmap for maximum efficiency (supported in Android 5.0+)
  if (typeof window.createImageBitmap === 'function') {
    try {
      // Decode image first to get dimensions
      const tempBitmap = await createImageBitmap(file);
      let width = tempBitmap.width;
      let height = tempBitmap.height;
      tempBitmap.close(); // Immediate release

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Resize during decoding if possible (more memory efficient)
      const bitmap = await createImageBitmap(file, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high'
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close(); // Immediate release
        const dataUrl = canvas.toDataURL(mimeType, quality);
        return dataUrl;
      }
      bitmap.close();
    } catch (err) {
      console.warn("createImageBitmap failed, falling back to legacy Image:", err);
    }
  }

  // 2. Legacy Image-based approach
  return new Promise((resolve, reject) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      safeFallback(file).then(resolve).catch(reject);
      return;
    }

    const img = new Image();

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          safeFallback(file).then(resolve).catch(reject);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        if (objectUrl) URL.revokeObjectURL(objectUrl);

        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      } catch (err) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        safeFallback(file).then(resolve).catch(reject);
      }
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      safeFallback(file).then(resolve).catch(reject);
    };

    img.src = objectUrl;
  });
}
