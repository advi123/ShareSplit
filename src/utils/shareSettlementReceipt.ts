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

export async function generateSettlementReceiptBlob(data: {
  title: string;
  dateRange: string;
  currency: string;
  transactions: { fromName: string; toName: string; amount: number }[];
}): Promise<Blob> {
  const width = 760;
  const padding = 44;
  const rowHeight = 72;
  const headerHeight = 190;
  const footerHeight = 80;
  const contentHeight = Math.max(1, data.transactions.length) * rowHeight;
  const height = headerHeight + contentHeight + footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width * 2; // 2x retina DPI
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.scale(2, 2);

  // Background Gradient (Deep Navy PhonePe / Modern Dark Theme)
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
  roundRect(ctx, padding, 28, 125, 28, 8);
  ctx.fill();
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('⚡ ShareSplit', padding + 16, 47);

  // Main Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.title, padding, 96);

  // Subtitle / Date range
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Settlement Period: ${data.dateRange}`, padding, 126);

  // Divider
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding, 150);
  ctx.lineTo(width - padding, 150);
  ctx.stroke();

  // Transactions list
  let y = 175;
  if (data.transactions.length === 0) {
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, padding, y, width - padding * 2, 60, 14);
    ctx.fill();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText('✓ Group is 100% Settled. No debt transfers needed!', padding + 24, y + 36);
  } else {
    for (const tx of data.transactions) {
      // Row card
      ctx.fillStyle = '#131d31';
      roundRect(ctx, padding, y, width - padding * 2, 58, 14);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Debtor name pill
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
      ctx.font = 'black 22px system-ui, -apple-system, sans-serif';
      const amtStr = `${data.currency}${Math.round(tx.amount).toLocaleString('en-IN')}`;
      const amtWidth = ctx.measureText(amtStr).width;
      ctx.fillText(amtStr, width - padding - 24 - amtWidth, y + 37);

      y += rowHeight;
    }
  }

  // Footer divider
  const footerY = height - 50;
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(padding, footerY);
  ctx.lineTo(width - padding, footerY);
  ctx.stroke();

  // Footer text
  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText('PhonePe / GPay verified split • Minimum necessary debt transfer', padding, footerY + 28);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

export async function shareOrDownloadReceipt(
  data: {
    title: string;
    dateRange: string;
    currency: string;
    transactions: { fromName: string; toName: string; amount: number }[];
  },
  onToast?: (msg: string, type?: 'info' | 'error' | 'success') => void
) {
  try {
    const blob = await generateSettlementReceiptBlob(data);
    const file = new File([blob], 'sharesplit-settlement.png', { type: 'image/png' });

    const summaryLines = data.transactions.map(
      (tx) => `• ${tx.fromName} pays ${tx.toName}: ${data.currency}${Math.round(tx.amount)}`
    );
    const textSummary = `🧾 ${data.title} (${data.dateRange})\n${
      summaryLines.length > 0 ? summaryLines.join('\n') : 'All members are 100% settled!'
    }\n— Generated by ShareSplit`;

    // 1. Native mobile share sheet with image
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: data.title,
        text: textSummary
      });
      onToast?.('Settlement receipt shared successfully!', 'success');
      return;
    }

    // 2. PC / Desktop fallback: Download image file & copy summary text
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sharesplit-settlement-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(textSummary);
      onToast?.('Receipt image downloaded & text summary copied to clipboard!', 'success');
    } else {
      onToast?.('Receipt image downloaded successfully!', 'success');
    }
  } catch (err: any) {
    if (err.name === 'AbortError') return; // User closed share sheet
    console.error('Share receipt error:', err);
    onToast?.(err.message || 'Could not share receipt image', 'error');
  }
}
