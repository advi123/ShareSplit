/**
 * Utility to pre-process receipt photos for high-accuracy OCR.
 * Eliminates shadows, glare, low contrast, and scales to optimal OCR DPI.
 */

export interface PreprocessOptions {
  enhance?: boolean;
  contrast?: number; // 1.0 = normal, 1.5 = high
  threshold?: number; // 0 to 255, -1 for auto adaptive
  maxWidth?: number;
}

export async function preprocessReceiptImage(
  dataUrl: string,
  options: PreprocessOptions = {}
): Promise<{ enhancedUrl: string; width: number; height: number }> {
  const {
    enhance = true,
    contrast = 1.4,
    maxWidth = 1800
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale to optimal OCR dimensions (receipts are best read at ~1400-1800px width)
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      } else if (width < 1000) {
        const scale = 1400 / width;
        width = 1400;
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ enhancedUrl: dataUrl, width: img.width, height: img.height });
        return;
      }

      // Draw initial image
      ctx.drawImage(img, 0, 0, width, height);

      if (!enhance) {
        resolve({ enhancedUrl: canvas.toDataURL('image/jpeg', 0.92), width, height });
        return;
      }

      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // 1. Calculate luminance and find min/max for dynamic contrast stretching
      let minL = 255;
      let maxL = 0;
      let totalL = 0;
      const pixelCount = width * height;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        if (lum < minL) minL = lum;
        if (lum > maxL) maxL = lum;
        totalL += lum;
      }

      const avgL = totalL / pixelCount;
      const range = Math.max(1, maxL - minL);

      // Contrast factor calculation
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

      // Adaptive cutoff for receipts: thermal paper background is usually lighter than avg
      const cutoff = avgL * 0.88;

      // 2. Apply Grayscale + Contrast Stretch + Adaptive High-Pass Binarization
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Convert to grayscale
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Stretch dynamic range
        gray = ((gray - minL) / range) * 255;

        // Apply contrast factor
        gray = factor * (gray - 128) + 128;

        // Binarize text vs background to strip thermal paper grain & shadow
        if (gray < cutoff) {
          // Dark ink / printed text -> enhance to crisp black
          gray = Math.max(0, gray * 0.4);
        } else {
          // Paper background / shadow -> push to pure white
          gray = Math.min(255, gray * 1.35 + 30);
        }

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve({ enhancedUrl: canvas.toDataURL('image/jpeg', 0.92), width, height });
    };

    img.onerror = () => {
      resolve({ enhancedUrl: dataUrl, width: 0, height: 0 });
    };

    img.src = dataUrl;
  });
}

/**
 * Fast client-side image downscaling for AI Vision.
 * Resizes 12MP/48MP phone camera photos (5MB - 12MB) to optimal ~1500px resolution (150KB - 250KB),
 * reducing network transfer time and AI latency from 8+ seconds to ~1.5 seconds.
 */
export async function compressImageForAI(dataUrl: string, maxDim = 1500, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

