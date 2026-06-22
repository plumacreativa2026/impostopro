import React, { useRef, useEffect, useState } from 'react';
import { AppState, GridMetrics } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isSafeHorizontalCut, isSafeVerticalCut, isCropLineSafe } from '../utils/imposition';

interface PreviewCanvasProps {
  state: AppState;
  metrics: GridMetrics;
  pageCache: Record<number, HTMLCanvasElement>;
  onSheetChange: (newIndex: number) => void;
  triggerLazyPageRender: (pageNumber: number) => void;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  state,
  metrics,
  pageCache,
  onSheetChange,
  triggerLazyPageRender
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [displayScale, setDisplayScale] = useState<number>(1.0);

  // Resolve sheet dimensions
  let sheetW = state.sheetWidth;
  let sheetH = state.sheetHeight;
  if (state.isLandscape) {
    sheetW = Math.max(state.sheetWidth, state.sheetHeight);
    sheetH = Math.min(state.sheetWidth, state.sheetHeight);
  } else {
    sheetW = Math.min(state.sheetWidth, state.sheetHeight);
    sheetH = Math.max(state.sheetWidth, state.sheetHeight);
  }

  // Effect to handle canvas resizing and high-DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Outer limits of the container
    const containerW = container.clientWidth || 600;
    const maxVisualW = Math.max(280, containerW - 32);
    const maxVisualH = 500; // standard compact height

    const scale = Math.min(maxVisualW / sheetW, maxVisualH / sheetH);
    setDisplayScale(scale);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = sheetW * scale * dpr;
    canvas.height = sheetH * scale * dpr;
    canvas.style.width = `${sheetW * scale}px`;
    canvas.style.height = `${sheetH * scale}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(scale * dpr, scale * dpr);

    // 1. Draw clean sheet paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetW, sheetH);

    // 2. Draw printable area margins guide (dashed)
    const margin = state.marginSheet;
    ctx.strokeStyle = '#a67472';
    ctx.lineWidth = 0.35;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(
      margin, 
      margin, 
      Math.max(0, sheetW - margin * 2), 
      Math.max(0, sheetH - margin * 2)
    );
    ctx.setLineDash([]); // clear dash

    const cw = metrics.isRotated ? metrics.copyH : metrics.copyW;
    const ch = metrics.isRotated ? metrics.copyW : metrics.copyH;

    const gridW = metrics.cols * cw + (metrics.cols - 1) * state.gapX;
    const gridH = metrics.rows * ch + (metrics.rows - 1) * state.gapY;

    const startX = (sheetW - gridW) / 2;
    const startY = (sheetH - gridH) / 2;

    const numPages = state.sourceNumPages > 0 ? state.sourceNumPages : 1;
    const sheetIdx = state.previewSheetIndex;
    const copiesPerSheet = metrics.copiesPerSheet;

    const drawnLines = new Set<string>();
    const drawCropLine = (ax: number, ay: number, bx: number, by: number) => {
      const x1 = Math.min(ax, bx);
      const y1 = Math.min(ay, by);
      const x2 = Math.max(ax, bx);
      const y2 = Math.max(ay, by);
      const key = `${x1.toFixed(1)},${y1.toFixed(1)},${x2.toFixed(1)},${y2.toFixed(1)}`;
      
      if (!drawnLines.has(key)) {
        drawnLines.add(key);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    };

    // 3. Draw placed cells on current page
    for (const cell of metrics.placedCells) {
      const cellX = cell.x;
      const cellY = cell.y;
      const cellCw = cell.w;
      const cellCh = cell.h;
      const cellIdx = cell.cellIdx;

      let isActive = false;
      let pageIdx = 1;
      let displayLabel = '';

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
              displayLabel = `P. ${pageIdx} - Copia #${itemIdx + 1}`;
            } else if (state.chkFillEmpty) {
              pageIdx = page0 + 1;
              isActive = true;
              displayLabel = `P. ${pageIdx} - Riempimento`;
            }
          }
        } else { // collate
          let copyIdx = -1;
          if (state.impositionMode === 'nup' || state.impositionMode === 'step') {
            copyIdx = sheetIdx * copiesPerSheet + cellIdx;
          } else if (state.impositionMode === 'cutstack') {
            copyIdx = sheetIdx + cellIdx * metrics.sheetsNeeded;
          } else if (state.impositionMode === 'dutch') {
            copyIdx = sheetIdx * copiesPerSheet + cellIdx;
          }
          if (copyIdx >= 0) {
            if (copyIdx < state.totalCopies * numPages) {
              pageIdx = (copyIdx % numPages) + 1;
              isActive = true;
              displayLabel = `Set #${Math.floor(copyIdx / numPages) + 1} - P. ${pageIdx}`;
            } else if (state.chkFillEmpty) {
              pageIdx = (copyIdx % numPages) + 1;
              isActive = true;
              displayLabel = `Riemp. - P. ${pageIdx}`;
            }
          }
        }
      } else {
        // Single page document layout
        let copyIdx = -1;
        if (state.impositionMode === 'nup' || state.impositionMode === 'step' || state.impositionMode === 'dutch') {
          copyIdx = sheetIdx * copiesPerSheet + cellIdx;
        } else if (state.impositionMode === 'cutstack') {
          copyIdx = sheetIdx + cellIdx * metrics.sheetsNeeded;
        }
        if (copyIdx >= 0) {
          if (copyIdx < state.totalCopies) {
            pageIdx = 1;
            isActive = true;
            displayLabel = `Copia #${copyIdx + 1}`;
          } else if (state.chkFillEmpty) {
            pageIdx = 1;
            isActive = true;
            displayLabel = `Riempimento #${copyIdx + 1}`;
          }
        }
      }

      if (isActive) {
        const isFill = displayLabel.includes('Riemp') || displayLabel.includes('Riempimento');

        // Draw real PDF page images if available
        if (state.sourceFileBuffer) {
          ctx.save();
          let pageImg = pageCache[pageIdx];
          if (!pageImg) {
            triggerLazyPageRender(pageIdx);
          }

          if (pageImg) {
            if (cell.isRotated) {
              ctx.translate(cellX + cellCw / 2, cellY + cellCh / 2);
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(pageImg, -cellCh / 2, -cellCw / 2, cellCh, cellCw);
            } else {
              ctx.drawImage(pageImg, cellX, cellY, cellCw, cellCh);
            }
          } else {
            // Loading placeholder
            ctx.fillStyle = '#fbf9f6';
            ctx.fillRect(cellX, cellY, cellCw, cellCh);
            ctx.font = '3.5px monospace';
            ctx.fillStyle = '#a67472';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`P. ${pageIdx} (caricamento...)`, cellX + cellCw / 2, cellY + cellCh / 2);
          }
          ctx.restore();

          // Overlay badge for "Riempimento" if it is a fill copy
          if (isFill) {
            ctx.save();
            ctx.fillStyle = 'rgba(166, 116, 114, 0.85)'; // elegant primary accent brown-red
            const badgeW = Math.min(cellCw - 2, 22);
            ctx.fillRect(cellX + 1, cellY + 1, badgeW, 4.5);
            ctx.font = 'bold 2.5px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RIEMPIMENTO', cellX + 1 + badgeW / 2, cellY + 1 + 2.25);
            ctx.restore();
          }

          // Margin border overlay
          ctx.strokeStyle = isFill ? 'rgba(166, 116, 114, 0.5)' : 'rgba(166, 116, 114, 0.35)';
          ctx.lineWidth = 0.25;
          ctx.strokeRect(cellX, cellY, cellCw, cellCh);
        } else {
          // Empty state elegant layout thumbnail placeholder
          ctx.fillStyle = isFill ? '#FAF9F6' : '#FAF9F6';
          ctx.fillRect(cellX, cellY, cellCw, cellCh);

          ctx.strokeStyle = isFill ? '#a67472' : '#a67472';
          ctx.lineWidth = 0.4;
          if (isFill) {
            ctx.setLineDash([2, 2]); // dashed borders for filled empty cells to stand out
          }
          ctx.strokeRect(cellX, cellY, cellCw, cellCh);
          ctx.setLineDash([]);

          // Center designator text
          ctx.font = isFill ? '4.5px sans-serif' : 'bold 5px sans-serif';
          ctx.fillStyle = isFill ? '#b58381' : '#a67472';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(displayLabel, cellX + cellCw / 2, cellY + cellCh / 2 - 3);

          ctx.font = '3.5px monospace';
          ctx.fillStyle = '#8c7674';
          ctx.fillText(`${state.copyWidth}x${state.copyHeight} mm`, cellX + cellCw / 2, cellY + cellCh / 2 + 3);
        }

        // Draw a visual badge centered on preview canvas to identify compiling sequences
        if (state.sourceNumPages > 1) {
          ctx.save();
          ctx.fillStyle = 'rgba(166, 116, 114, 0.22)';
          ctx.font = `bold ${Math.min(cellCw, cellCh) * 0.35}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pageIdx.toString(), cellX + cellCw / 2, cellY + cellCh / 2);
          ctx.restore();
        }

        // Draw visual trim lines if bleed is requested
        if (state.chkBleed) {
          const B = state.bleedMm;
          ctx.save();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)'; // Elegant light-red split line
          ctx.lineWidth = 0.25;
          ctx.setLineDash([1, 1]);
          ctx.strokeRect(cellX + B, cellY + B, cellCw - 2 * B, cellCh - 2 * B);
          ctx.restore();
        }
      } else {
        // Grayed hashed frame indicating inactive empty slots
        ctx.strokeStyle = '#e5e1dc';
        ctx.lineWidth = 0.3;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(cellX, cellY, cellCw, cellCh);
        ctx.setLineDash([]);
      }

      // Individual crop marks (printed for all layout boxes, active or inactive)
      if (state.chkCropMarks) {
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 0.2;

        const offset = 2; // mm
        const cropLen = 3; // mm
        const B = state.chkBleed ? state.bleedMm : 0;

        const x1 = cellX + B;
        const x2 = cellX + cellCw - B;
        const y1 = cellY + B;
        const y2 = cellY + cellCh - B;

        // Top-Left corner
        if (isCropLineSafe(x1, cellY - offset, x1, cellY - offset - cropLen, metrics.placedCells)) {
          drawCropLine(x1, cellY - offset, x1, cellY - offset - cropLen);
        }
        if (isCropLineSafe(cellX - offset, y1, cellX - offset - cropLen, y1, metrics.placedCells)) {
          drawCropLine(cellX - offset, y1, cellX - offset - cropLen, y1);
        }

        // Top-Right corner
        if (isCropLineSafe(x2, cellY - offset, x2, cellY - offset - cropLen, metrics.placedCells)) {
          drawCropLine(x2, cellY - offset, x2, cellY - offset - cropLen);
        }
        if (isCropLineSafe(cellX + cellCw + offset, y1, cellX + cellCw + offset + cropLen, y1, metrics.placedCells)) {
          drawCropLine(cellX + cellCw + offset, y1, cellX + cellCw + offset + cropLen, y1);
        }

        // Bottom-Left corner
        if (isCropLineSafe(x1, cellY + cellCh + offset, x1, cellY + cellCh + offset + cropLen, metrics.placedCells)) {
          drawCropLine(x1, cellY + cellCh + offset, x1, cellY + cellCh + offset + cropLen);
        }
        if (isCropLineSafe(cellX - offset, y2, cellX - offset - cropLen, y2, metrics.placedCells)) {
          drawCropLine(cellX - offset, y2, cellX - offset - cropLen, y2);
        }

        // Bottom-Right corner
        if (isCropLineSafe(x2, cellY + cellCh + offset, x2, cellY + cellCh + offset + cropLen, metrics.placedCells)) {
          drawCropLine(x2, cellY + cellCh + offset, x2, cellY + cellCh + offset + cropLen);
        }
        if (isCropLineSafe(cellX + cellCw + offset, y2, cellX + cellCw + offset + cropLen, y2, metrics.placedCells)) {
          drawCropLine(cellX + cellCw + offset, y2, cellX + cellCw + offset + cropLen, y2);
        }
      }
    }

    // Outer-perimeter common-cut crop marks (when layout has no gaps / N-UP, Cut-Stack)
    const isDutchOrMixed = state.impositionMode === 'dutch' || (metrics.placedCells.some(c => c.isRotated) && metrics.placedCells.some(c => !c.isRotated));
    const isZeroGapMode = !isDutchOrMixed && (state.impositionMode === 'nup' || state.impositionMode === 'cutstack' || (state.gapX === 0 && state.gapY === 0));
    if (state.chkCropMarks && isZeroGapMode) {
      ctx.strokeStyle = '#1e1e1e';
      ctx.lineWidth = 0.2;

      const offset = 2;
      const cropLen = 3;
      const B = state.chkBleed ? state.bleedMm : 0;

      const cutXs = new Set<number>();
      const cutYs = new Set<number>();

      for (let c = 0; c < metrics.cols; c++) {
        const cellX = startX + c * cw;
        cutXs.add(cellX + B);
        cutXs.add(cellX + cw - B);
      }
      for (let r = 0; r < metrics.rows; r++) {
        const cellY = startY + r * ch;
        cutYs.add(cellY + B);
        cutYs.add(cellY + ch - B);
      }

      // Draw col boundaries
      for (const x of cutXs) {
        drawCropLine(x, startY - offset, x, startY - offset - cropLen);
        drawCropLine(x, startY + gridH + offset, x, startY + gridH + offset + cropLen);
      }

      // Draw row boundaries
      for (const y of cutYs) {
        drawCropLine(startX - offset, y, startX - offset - cropLen, y);
        drawCropLine(startX + gridW + offset, y, startX + gridW + offset + cropLen, y);
      }
    }

    // 4. Draw sheet perimeter frame
    ctx.strokeStyle = '#c7beaf';
    ctx.lineWidth = 0.4;
    ctx.strokeRect(0, 0, sheetW, sheetH);

    ctx.restore();
  }, [state, metrics, pageCache, sheetW, sheetH]);

  const maxSheets = metrics.sheetsNeeded || 1;
  const currentSheetLabel = `Foglio ${state.previewSheetIndex + 1} di ${maxSheets}`;

  return (
    <div className="flex flex-col w-full h-full items-center justify-between">
      {/* Visual Canvas Frame */}
      <div 
        ref={containerRef}
        className="w-full h-full min-h-[440px] flex items-center justify-center p-8 bg-[#FAF9F6]/50 border border-[#e5e1dc] rounded-2xl relative"
      >
        <canvas 
          ref={canvasRef} 
          className="shadow-xl rounded-xs bg-white border border-[#e5e1dc]/50"
        />

        {/* Fit scale indicator */}
        <div className="absolute top-4 left-4 bg-[#FAF9F6]/90 backdrop-blur-md border border-[#e5e1dc] text-[9px] font-mono font-bold text-stone-600 px-3 py-1.5 rounded-full shadow-3xs tracking-wider select-none">
          SCALA DI VISUALIZZAZIONE: FIT ({(displayScale).toFixed(1)} PX/MM)
        </div>

        {/* Navigation Pager */}
        <div className="absolute bottom-4 right-4 bg-white border border-[#e5e1dc] rounded-xl px-2.5 py-1 flex items-center gap-1.5 z-10 select-none shadow-3xs">
          <button
            onClick={() => onSheetChange(Math.max(0, state.previewSheetIndex - 1))}
            disabled={state.previewSheetIndex <= 0}
            className="p-1 text-[#a67472] hover:bg-stone-50 rounded-lg disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-display font-black uppercase tracking-wider text-stone-700 mx-1">{currentSheetLabel}</span>
          <button
            onClick={() => onSheetChange(Math.min(maxSheets - 1, state.previewSheetIndex + 1))}
            disabled={state.previewSheetIndex >= maxSheets - 1}
            className="p-1 text-[#a67472] hover:bg-stone-50 rounded-lg disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Centered caption under sheet container */}
      <div className="text-[9px] text-[#8c7674] font-bold font-mono tracking-widest uppercase text-center mt-4 select-none leading-none">
        RAPPRESENTAZIONE GRAFICA IN SCALA · AREA TRATTEGGIATA RAPPRESENTA I MARGINI ESTERNI
      </div>
    </div>
  );
};
