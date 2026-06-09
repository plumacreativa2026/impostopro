/**
 * ImpostoPro - PDF Lib & PDF.js Utility Helpers
 */

import { PDFDocument, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { AppState, GridMetrics, MM_TO_PT, PT_TO_MM } from '../types';

const pdfjsVersion = pdfjsLib.version || '6.0.227';
// Set up worker path via CDN with exact version matching to guarantee version matching and bypass CORS limits
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

// Cache active PDFJS document instance to improve scrolling performance and avoid concurrent document reload crashes
let cachedPdfDoc: any = null;
let cachedBuffer: ArrayBuffer | null = null;

async function getPdfDoc(buffer: ArrayBuffer): Promise<any> {
  if (cachedPdfDoc && cachedBuffer === buffer) {
    return cachedPdfDoc;
  }
  // Clear any existing document task to release memory
  if (cachedPdfDoc) {
    try {
      await cachedPdfDoc.destroy();
    } catch (e) {
      // Ignored
    }
  }
  const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
  cachedPdfDoc = await loadingTask.promise;
  cachedBuffer = buffer;
  return cachedPdfDoc;
}

export function clearPdfCache() {
  if (cachedPdfDoc) {
    try {
      cachedPdfDoc.destroy();
    } catch (e) {
      // Ignored
    }
  }
  cachedPdfDoc = null;
  cachedBuffer = null;
}

export interface PDFMetadata {
  numPages: number;
  widthPts: number;
  heightPts: number;
  widthMm: number;
  heightMm: number;
  renderedImage: HTMLCanvasElement;
}

/**
 * Loads a PDF file and extracts basic attributes and high-res page 1 render.
 */
export async function loadPDFMetadata(file: File): Promise<PDFMetadata> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await getPdfDoc(buffer);
  const numPages = pdfDoc.numPages;

  const page1 = await pdfDoc.getPage(1);
  const viewport = page1.getViewport({ scale: 1.0 });

  const widthPts = viewport.width;
  const heightPts = viewport.height;

  // Points to mm converter
  const widthMm = Math.round(viewport.width * PT_TO_MM * 10) / 10;
  const heightMm = Math.round(viewport.height * PT_TO_MM * 10) / 10;

  // Render high-res snapshot of page 1 at 3x scale
  const targetScale = 3.0;
  const highResViewport = page1.getViewport({ scale: targetScale });
  const renderedImage = document.createElement('canvas');
  renderedImage.width = highResViewport.width;
  renderedImage.height = highResViewport.height;
  const ctx = renderedImage.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2d context');

  await page1.render({
    canvasContext: ctx,
    viewport: highResViewport
  } as any).promise;

  return {
    numPages,
    widthPts,
    heightPts,
    widthMm,
    heightMm,
    renderedImage
  };
}

/**
 * Lazily renders a specific page index to an offscreen canvas.
 */
export async function renderPDFPageToCanvas(
  buffer: ArrayBuffer,
  pageNumber: number,
  scale = 3.0
): Promise<HTMLCanvasElement> {
  const pdfDoc = await getPdfDoc(buffer);
  const page = await pdfDoc.getPage(pageNumber);
  
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2d context');

  await page.render({
    canvasContext: ctx,
    viewport
  } as any).promise;

  return canvas;
}

/**
 * Executes high-definition imposition schema export targeting pure PDF bytes.
 */
export async function generateImposedPDF(
  state: AppState,
  m: GridMetrics
): Promise<Uint8Array> {
  if (!state.sourceFileBuffer) {
    throw new Error('sourceFileBuffer is empty');
  }

  const finalPdf = await PDFDocument.create();

  // Load source document and retrieve all pages to embed them correctly
  const srcDoc = await PDFDocument.load(state.sourceFileBuffer.slice(0));
  const pageIndices = srcDoc.getPageIndices();
  const embeddedPages = await finalPdf.embedPdf(srcDoc, pageIndices);

  // Sheet metrics
  let sheetW = state.sheetWidth;
  let sheetH = state.sheetHeight;
  if (state.isLandscape) {
    sheetW = Math.max(state.sheetWidth, state.sheetHeight);
    sheetH = Math.min(state.sheetWidth, state.sheetHeight);
  } else {
    sheetW = Math.min(state.sheetWidth, state.sheetHeight);
    sheetH = Math.max(state.sheetWidth, state.sheetHeight);
  }

  const sheetWPt = sheetW * MM_TO_PT;
  const sheetHPt = sheetH * MM_TO_PT;

  const totalSheets = m.sheetsNeeded;
  const copiesPerSheet = m.copiesPerSheet;

  const cw = m.isRotated ? m.copyH : m.copyW;
  const ch = m.isRotated ? m.copyW : m.copyH;

  const gridW = m.cols * cw + (m.cols - 1) * state.gapX;
  const gridH = m.rows * ch + (m.rows - 1) * state.gapY;

  const startX = (sheetW - gridW) / 2;
  const startY = (sheetH - gridH) / 2;

  const numPages = state.sourceNumPages > 0 ? state.sourceNumPages : 1;

  for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
    const page = finalPdf.addPage([sheetWPt, sheetHPt]);

    // Local crop marks set to deduplicate overlapping cut lines
    const drawnLinesSet = new Set<string>();
    const drawPdfCropLine = (ax_mm: number, ay_mm: number, bx_mm: number, by_mm: number) => {
      let x1 = Math.min(ax_mm, bx_mm);
      let y1 = Math.min(ay_mm, by_mm);
      let x2 = Math.max(ax_mm, bx_mm);
      let y2 = Math.max(ay_mm, by_mm);
      const key = `${x1.toFixed(1)},${y1.toFixed(1)},${x2.toFixed(1)},${y2.toFixed(1)}`;
      
      if (!drawnLinesSet.has(key)) {
        drawnLinesSet.add(key);
        // Map top-left centered coordinate origin to PDF bottom-left origin
        const ax_pt = ax_mm * MM_TO_PT;
        const ay_pt = (sheetH - ay_mm) * MM_TO_PT;
        const bx_pt = bx_mm * MM_TO_PT;
        const by_pt = (sheetH - by_mm) * MM_TO_PT;

        page.drawLine({
          start: { x: ax_pt, y: ay_pt },
          end: { x: bx_pt, y: by_pt },
          thickness: 0.25,
          color: rgb(0, 0, 0),
        });
      }
    };

    for (const cell of m.placedCells) {
      const cellX = cell.x;
      const cellY = cell.y;
      const cellCw = cell.w;
      const cellCh = cell.h;
      const cellIdx = cell.cellIdx;

      let isActive = false;
      let pageIdx = 1;

      if (state.sourceNumPages > 1) {
        if (state.pageDistributionMode === 'repeat') {
          const sheetsPerPage = Math.ceil(state.totalCopies / copiesPerSheet);
          const page0 = Math.floor(sheetIdx / sheetsPerPage);
          if (page0 < numPages) {
            const localSheet = sheetIdx % sheetsPerPage;
            const itemIdx = localSheet * copiesPerSheet + cellIdx;
            if (itemIdx < state.totalCopies) {
              pageIdx = page0 + 1;
              isActive = true;
            } else if (state.chkFillEmpty) {
              pageIdx = page0 + 1;
              isActive = true;
            }
          }
        } else { // collate
          let copyIdx = -1;
          if (state.impositionMode === 'nup' || state.impositionMode === 'step') {
            copyIdx = sheetIdx * copiesPerSheet + cellIdx;
          } else if (state.impositionMode === 'cutstack') {
            copyIdx = sheetIdx + cellIdx * m.sheetsNeeded;
          } else if (state.impositionMode === 'dutch') {
            copyIdx = sheetIdx * copiesPerSheet + cellIdx;
          }
          if (copyIdx >= 0) {
            if (copyIdx < state.totalCopies * numPages) {
              pageIdx = (copyIdx % numPages) + 1;
              isActive = true;
            } else if (state.chkFillEmpty) {
              pageIdx = (copyIdx % numPages) + 1;
              isActive = true;
            }
          }
        }
      } else {
        // Single page document layout
        let copyIdx = -1;
        if (state.impositionMode === 'nup' || state.impositionMode === 'step' || state.impositionMode === 'dutch') {
          copyIdx = sheetIdx * copiesPerSheet + cellIdx;
        } else if (state.impositionMode === 'cutstack') {
          copyIdx = sheetIdx + cellIdx * m.sheetsNeeded;
        }
        if (copyIdx >= 0) {
          if (copyIdx < state.totalCopies) {
            pageIdx = 1;
            isActive = true;
          } else if (state.chkFillEmpty) {
            pageIdx = 1;
            isActive = true;
          }
        }
      }

      if (isActive) {
        // Map bounding coordinates
        const x_pdf = cellX * MM_TO_PT;
        const y_pdf = (sheetH - (cellY + cellCh)) * MM_TO_PT;

        const embeddedPageToDraw = embeddedPages[pageIdx - 1];

        if (cell.isRotated) {
          page.drawPage(embeddedPageToDraw, {
            x: x_pdf,
            y: y_pdf + (cellCh * MM_TO_PT),
            width: cellCh * MM_TO_PT,
            height: cellCw * MM_TO_PT,
            rotate: degrees(-90), // standard rotation degree format
          });
        } else {
          page.drawPage(embeddedPageToDraw, {
            x: x_pdf,
            y: y_pdf,
            width: cellCw * MM_TO_PT,
            height: cellCh * MM_TO_PT,
            rotate: degrees(0),
          });
        }

        // Individual cell crop marks (when gaps are present)
        if (state.chkCropMarks) {
          const isZeroGapMode = state.impositionMode === 'nup' || state.impositionMode === 'cutstack';
          if (!isZeroGapMode) {
            const offset = 2; // mm
            const cropLen = 3; // mm

            const B = state.chkBleed ? state.bleedMm : 0;
            const x1 = cellX + B;
            const x2 = cellX + cellCw - B;
            const y1 = cellY + B;
            const y2 = cellY + cellCh - B;

            // Top-Left corner
            drawPdfCropLine(x1, cellY - offset, x1, cellY - offset - cropLen);
            drawPdfCropLine(cellX - offset, y1, cellX - offset - cropLen, y1);

            // Top-Right corner
            drawPdfCropLine(x2, cellY - offset, x2, cellY - offset - cropLen);
            drawPdfCropLine(cellX + cellCw + offset, y1, cellX + cellCw + offset + cropLen, y1);

            // Bottom-Left corner
            drawPdfCropLine(x1, cellY + cellCh + offset, x1, cellY + cellCh + offset + cropLen);
            drawPdfCropLine(cellX - offset, y2, cellX - offset - cropLen, y2);

            // Bottom-Right corner
            drawPdfCropLine(x2, cellY + cellCh + offset, x2, cellY + cellCh + offset + cropLen);
            drawPdfCropLine(cellX + cellCw + offset, y2, cellX + cellCw + offset + cropLen, y2);
          }
        }
      }
    }

    // Outer grid common-cut crop marks (when no gaps are used)
    const isZeroGapMode = state.impositionMode === 'nup' || state.impositionMode === 'cutstack';
    if (state.chkCropMarks && isZeroGapMode) {
      const offset = 2; // mm
      const cropLen = 3; // mm
      const B = state.chkBleed ? state.bleedMm : 0;

      const cutXs = new Set<number>();
      const cutYs = new Set<number>();

      for (let c = 0; c < m.cols; c++) {
        const cellX = startX + c * cw;
        cutXs.add(cellX + B);
        cutXs.add(cellX + cw - B);
      }
      for (let r = 0; r < m.rows; r++) {
        const cellY = startY + r * ch;
        cutYs.add(cellY + B);
        cutYs.add(cellY + ch - B);
      }

      // Col cuts (vertical indices)
      for (const x of cutXs) {
        drawPdfCropLine(x, startY - offset, x, startY - offset - cropLen);
        drawPdfCropLine(x, startY + gridH + offset, x, startY + gridH + offset + cropLen);
      }

      // Row cuts (horizontal indices)
      for (const y of cutYs) {
        drawPdfCropLine(startX - offset, y, startX - offset - cropLen, y);
        drawPdfCropLine(startX + gridW + offset, y, startX + gridW + offset + cropLen, y);
      }
    }
  }

  const finalBytes = await finalPdf.save();
  return finalBytes;
}
