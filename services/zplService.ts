
import { PDFDocument } from 'pdf-lib';

/**
 * ZPL to PDF conversion using the Labelary API.
 * Labels are processed in batches for efficiency and reliability.
 * Multi-batch PDFs are merged using pdf-lib.
 */
export const processZplToPdf = async (
  labels: string[], 
  dpi: string, 
  size: string, 
  onProgress: (current: number) => void,
  onBatchError: (message: string) => void
): Promise<{ blob: Blob | null; failedCount: number; successCount: number }> => {
  const BATCH_SIZE = 50; 
  // REST API expects trailing slash for label dimensions
  const baseUrl = `https://api.labelary.com/v1/printers/${dpi.trim()}/labels/${size.trim()}/`;
  
  const mergedPdf = await PDFDocument.create();
  let totalSuccessfulLabels = 0;
  let totalFailedLabels = 0;

  for (let i = 0; i < labels.length; i += BATCH_SIZE) {
    // Add small delay between batches starting from second batch for API stability
    if (i > 0) {
      await new Promise(r => setTimeout(r, 2000)); 
    }

    const batch = labels.slice(i, i + BATCH_SIZE).join('\n');
    let retryCount = 0;
    const MAX_RETRIES = 3;
    let success = false;
    let lastError = "";

    while (retryCount < MAX_RETRIES && !success) {
      try {
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/pdf',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: batch
        });

        if (!response.ok) {
          const rawError = await response.text();
          const cleanError = rawError.replace(/<[^>]*>?/gm, '').trim(); 
          throw new Error(`Status ${response.status}: ${cleanError.slice(0, 150)}`);
        }

        const pdfBytes = await response.arrayBuffer();
        const donorPdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
        
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });

        totalSuccessfulLabels += labels.slice(i, Math.min(i + BATCH_SIZE, labels.length)).length;
        success = true;
      } catch (error) {
        retryCount++;
        lastError = error instanceof Error ? error.message : String(error);
        if (retryCount === MAX_RETRIES) {
          const failedBatchCount = labels.slice(i, Math.min(i + BATCH_SIZE, labels.length)).length;
          totalFailedLabels += failedBatchCount;
          const endRange = Math.min(i + BATCH_SIZE, labels.length);
          onBatchError(`Batch [${i+1}-${endRange}] failed after ${MAX_RETRIES} attempts: ${lastError}`);
        } else {
          await new Promise(r => setTimeout(r, 1000 * retryCount));
        }
      }
    }
    
    onProgress(totalSuccessfulLabels + totalFailedLabels);
  }

  const finalPdfBytes = totalSuccessfulLabels > 0 ? await mergedPdf.save() : null;
  return {
    blob: finalPdfBytes ? new Blob([finalPdfBytes], { type: 'application/pdf' }) : null,
    failedCount: totalFailedLabels,
    successCount: totalSuccessfulLabels
  };
};

/**
 * Sends raw ZPL strings directly to a connected USB Zebra printer.
 * This bypasses PDF conversion and the browser's print dialog.
 */
export const printRawZplToUsb = async (device: USBDevice, zpl: string) => {
  try {
    if (!device.opened) {
      await device.open();
    }
    
    // Select configuration (usually 1) and claim interface (usually 0 for Zebra)
    await device.selectConfiguration(1);
    await device.claimInterface(device.configuration?.interfaces[0].interfaceNumber || 0);

    const encoder = new TextEncoder();
    const data = encoder.encode(zpl);

    // Find the bulk output endpoint
    const endpoint = device.configuration?.interfaces[0].alternate.endpoints.find(
      e => e.direction === 'out' && e.type === 'bulk'
    );

    if (!endpoint) throw new Error("No bulk output endpoint found on printer.");

    await device.transferOut(endpoint.endpointNumber, data);
    
    // It's good practice not to close immediately if printing a large batch
    // but for simple cases we could. Usually we keep it open while the app is active.
  } catch (error) {
    console.error("USB Printing Failed:", error);
    throw error;
  }
};

/**
 * Attempts to detect the label size from ZPL commands (^PW and ^LL)
 * or by scanning all coordinate references (^FO, ^FT, etc.).
 * Returns size string (e.g. "4x6" or "100x50mm").
 */
export const detectLabelSize = (zpl: string, dpmm: string): string => {
  // Map dpmm to dots per inch
  const dpiMap: Record<string, number> = {
    '6dpmm': 152,
    '8dpmm': 203,
    '12dpmm': 300,
    '24dpmm': 600
  };
  const dpi = dpiMap[dpmm] || 203;
  const dpmmValue = dpi / 25.4;

  // 1. Check explicit Width and Length tags
  const pwMatch = zpl.match(/\^PW(\d+)/i);
  const llMatch = zpl.match(/\^LL(\d+)/i);

  let widthInDots = pwMatch ? parseInt(pwMatch[1]) : 0;
  let heightInDots = llMatch ? parseInt(llMatch[1]) : 0;

  // 2. If tags missing, scan for bounded box of content elements
  if (widthInDots === 0 || heightInDots === 0) {
    const commands = Array.from(zpl.matchAll(/\^([A-Z1-9]{2})([^$^~]*)/gi));
    let curX = 0, curY = 0;
    let maxX = 0, maxY = 0;

    commands.forEach(cmd => {
      const type = cmd[1].toUpperCase();
      const params = cmd[2].split(',');
      
      if (type === 'FO' || type === 'FT') {
        curX = parseInt(params[0]) || 0;
        curY = parseInt(params[1]) || 0;
        if (curX > maxX) maxX = curX;
        if (curY > maxY) maxY = curY;
      } else if (type === 'GB') {
        const w = parseInt(params[0]) || 0;
        const h = parseInt(params[1]) || 0;
        if (curX + w > maxX) maxX = curX + w;
        if (curY + h > maxY) maxY = curY + h;
      } else if (type.startsWith('B') && type.length === 2) {
        // Barcodes usually have height in second or third param
        // For BC/B3/B4 etc. BC,h,o...
        const h = parseInt(params[1]) || 0;
        if (curY + h > maxY) maxY = curY + h;
      }
    });

    // Add 5% padding or minimum 40 dots
    if (widthInDots === 0 && maxX > 0) widthInDots = maxX + Math.max(40, maxX * 0.05);
    if (heightInDots === 0 && maxY > 0) heightInDots = maxY + Math.max(40, maxY * 0.05);
  }

  // Fallback defaults
  if (widthInDots === 0) widthInDots = 812; // 4 inches at 203dpi
  if (heightInDots === 0) heightInDots = 1218; // 6 inches at 203dpi

  // Heuristic: Prefer metric if dimensions are close to integer mm standard sizes
  // or if explicitly looking for metric (common in non-US regions).
  const widthMm = widthInDots / dpmmValue;
  const heightMm = heightInDots / dpmmValue;
  const widthIn = widthInDots / dpi;
  const heightIn = heightInDots / dpi;

  // Decision score: lower is better (closer to "round" integer)
  // Biasing mm slightly since metric is common for these sizes
  const metricScore = (Math.abs(widthMm - Math.round(widthMm)) + Math.abs(heightMm - Math.round(heightMm))) * 0.8;
  const imperialScore = Math.abs(widthIn * 4 - Math.round(widthIn * 4)) + Math.abs(heightIn * 4 - Math.round(heightIn * 4));

  // Snap to common standard sizes with 4mm tolerance
  const commonMetric: [number, number, string][] = [
    [100, 50, "100x50mm"],
    [100, 100, "100x100mm"],
    [100, 150, "100x150mm"],
    [101.6, 152.4, "4x6"],
    [75, 50, "75x50mm"],
    [50, 25, "50x25mm"]
  ];
  
  for (const [mW, mH, name] of commonMetric) {
    if (Math.abs(widthMm - mW) < 5 && Math.abs(heightMm - mH) < 5) {
      return name;
    }
  }

  const isMetric = metricScore < imperialScore || widthMm > 250;
  
  if (isMetric) {
    return `${Math.round(widthMm)}x${Math.round(heightMm)}mm`;
  }

  // Default to inches, clean up decimals
  const clean = (v: number) => v.toFixed(2).replace(/\.00$/, "");
  return `${clean(widthIn)}x${clean(heightIn)}`;
};
