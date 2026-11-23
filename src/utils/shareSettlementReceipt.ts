function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export interface SettlementReceiptData {
  title: string;
  dateRange: string;
  currency: string;
  transactions: { fromName: string; toName: string; amount: number }[];
}

export async function generateSettlementReceiptBlob(
  data: SettlementReceiptData,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<Blob> {
  const width = 760;
  const padding = 44;
  const rowHeight = 72;
  const headerHeight = 175;
  const bottomPadding = 36;
  const contentHeight = Math.max(1, data.transactions.length) * rowHeight;
  const height = headerHeight + contentHeight + bottomPadding;

  const canvas = document.createElement('canvas');
  canvas.width = width * 2; // 2x retina DPI
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.scale(2, 2);

  // Background Gradient (Deep Navy Theme)
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#090d16');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Top emerald accent bar
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 0, width, 5);

  // Brand tag badge
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, padding, 26, 125, 28, 8);
  ctx.fill();
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('⚡ ShareSplit', padding + 16, 45);

  // Main Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.title, padding, 94);

  // Subtitle / Date range
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Settlement Period: ${data.dateRange}`, padding, 122);

  // Divider
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding, 144);
  ctx.lineTo(width - padding, 144);
  ctx.stroke();

  // Transactions list
  let y = 166;
  if (data.transactions.length === 0) {
    ctx.fillStyle = '#131d31';
    roundRect(ctx, padding, y, width - padding * 2, 58, 14);
    ctx.fill();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText('✓ Group is 100% Settled. No debt transfers needed!', padding + 24, y + 35);
  } else {
    for (const tx of data.transactions) {
      // Row card
      ctx.fillStyle = '#131d31';
      roundRect(ctx, padding, y, width - padding * 2, 58, 14);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Debtor name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(tx.fromName, padding + 20, y + 35);

      // "PAYS →" arrow badge
      const debtorWidth = ctx.measureText(tx.fromName).width;
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText('PAYS →', padding + 34 + debtorWidth, y + 34);

      // Creditor name
      const arrowWidth = ctx.measureText('PAYS →').width;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(tx.toName, padding + 48 + debtorWidth + arrowWidth, y + 35);

      // Amount on right in green
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      const amtStr = `${data.currency}${Math.round(tx.amount).toLocaleString('en-IN')}`;
      const amtWidth = ctx.measureText(amtStr).width;
      ctx.fillText(amtStr, width - padding - 24 - amtWidth, y + 37);

      y += rowHeight;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      mimeType,
      0.95
    );
  });
}

/**
 * Native Mobile Share: Shares strictly the JPEG image file with NO text message or caption.
 * Android OS treats this purely as an image intent, putting WhatsApp directly in the first row.
 */
export async function shareOrDownloadReceipt(
  data: SettlementReceiptData,
  onToast?: (msg: string, type?: 'info' | 'error' | 'success') => void
) {
  try {
    const blob = await generateSettlementReceiptBlob(data, 'image/jpeg');
    const file = new File([blob], 'settlement-receipt.jpg', { type: 'image/jpeg' });

    // 1. Mobile native share sheet: Share ONLY image file, NO text message
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file]
      });
      return;
    }

    // 2. Fallback to direct download
    downloadBlobFile(blob, 'settlement-receipt.jpg');
    onToast?.('Receipt image downloaded to your device!', 'success');
  } catch (err: any) {
    if (err.name === 'AbortError') return; // User simply closed the share sheet
    console.error('Share receipt error:', err);
    // If share fails, fallback to download
    try {
      const blob = await generateSettlementReceiptBlob(data, 'image/jpeg');
      downloadBlobFile(blob, 'settlement-receipt.jpg');
      onToast?.('Receipt image saved to downloads!', 'success');
    } catch {
      onToast?.('Could not share or download receipt image', 'error');
    }
  }
}

/**
 * Direct Download: Saves the settlement receipt image directly to user's device/gallery.
 */
export async function downloadReceiptImage(
  data: SettlementReceiptData,
  onToast?: (msg: string, type?: 'info' | 'error' | 'success') => void
) {
  try {
    const blob = await generateSettlementReceiptBlob(data, 'image/jpeg');
    downloadBlobFile(blob, 'settlement-receipt.jpg');
    onToast?.('Receipt image downloaded successfully!', 'success');
  } catch (err: any) {
    console.error('Download receipt error:', err);
    onToast?.('Could not download receipt image', 'error');
  }
}

/**
 * Copy to Clipboard: Copies image directly so user can paste it into WhatsApp or any chat.
 */
export async function copyReceiptImage(
  data: SettlementReceiptData,
  onToast?: (msg: string, type?: 'info' | 'error' | 'success') => void
) {
  try {
    const blob = await generateSettlementReceiptBlob(data, 'image/png');
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      onToast?.('Receipt image copied! You can paste directly into WhatsApp', 'success');
      return true;
    }
    throw new Error('Clipboard image not supported');
  } catch (err) {
    console.warn('Clipboard copy failed:', err);
    onToast?.('Copy not supported on this browser. Use Share or Download.', 'info');
    return false;
  }
}

function downloadBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
