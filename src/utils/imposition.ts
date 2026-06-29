/**
 * ImpostoPro - Imposition Grid Calculations & Dutch Cut Solver
 */

import { AppState, GridMetrics, PlacedCell } from '../types';

export function calculateGridMetrics(state: AppState): GridMetrics {
  // Resolve sheet dimensions based on orientation
  let currentSheetW = state.sheetWidth;
  let currentSheetH = state.sheetHeight;

  if (state.isLandscape) {
    const w = state.sheetWidth;
    const h = state.sheetHeight;
    currentSheetW = Math.max(w, h);
    currentSheetH = Math.min(w, h);
  } else {
    const w = state.sheetWidth;
    const h = state.sheetHeight;
    currentSheetW = Math.min(w, h);
    currentSheetH = Math.max(w, h);
  }

  // Margins
  const margin = state.marginSheet;
  const printableW = Math.max(0, currentSheetW - margin * 2);
  const printableH = Math.max(0, currentSheetH - margin * 2);

  const cw = state.copyWidth;
  const ch = state.copyHeight;

  // Let's resolve the actual page count
  const numPages = state.sourceNumPages > 0 ? state.sourceNumPages : 1;

  if (state.impositionMode === 'dutch' || (state.chkAutoRotate && state.isGridAuto && state.impositionMode !== 'cutstack')) {
    // Dutch Cut optimization algorithm!
    let bestCells: PlacedCell[] = [];
    let bestCount = 0;

    // Base Case A: regular layout without rotation
    const colsNormal = Math.max(0, Math.floor((printableW + state.gapX) / (cw + state.gapX)));
    const rowsNormal = Math.max(0, Math.floor((printableH + state.gapY) / (ch + state.gapY)));
    const fitNormal = colsNormal * rowsNormal;

    // Base Case B: regular layout with rotation
    const cwRot = ch;
    const chRot = cw;
    const colsRot = Math.max(0, Math.floor((printableW + state.gapX) / (cwRot + state.gapX)));
    const rowsRot = Math.max(0, Math.floor((printableH + state.gapY) / (chRot + state.gapY)));
    const fitRot = colsRot * rowsRot;

    // Initialize with standard grid that fits more
    if (fitRot > fitNormal) {
      bestCount = fitRot;
      let idx = 0;
      for (let r = 0; r < rowsRot; r++) {
        for (let c = 0; c < colsRot; c++) {
          bestCells.push({
            x: margin + c * (cwRot + state.gapX),
            y: margin + r * (chRot + state.gapY),
            w: cwRot,
            h: chRot,
            isRotated: true,
            cellIdx: idx++
          });
        }
      }
    } else {
      bestCount = fitNormal;
      let idx = 0;
      for (let r = 0; r < rowsNormal; r++) {
        for (let c = 0; c < colsNormal; c++) {
          bestCells.push({
            x: margin + c * (cw + state.gapX),
            y: margin + r * (ch + state.gapY),
            w: cw,
            h: ch,
            isRotated: false,
            cellIdx: idx++
          });
        }
      }
    }

    // Now check all 4 guillotine split combinations to optimize:
    
    // Split 1: Vertical split. Normal left, Rotated right
    for (let cNorm = 1; cNorm <= colsNormal; cNorm++) {
      const w1 = cNorm * cw + (cNorm - 1) * state.gapX;
      if (w1 > printableW) continue;
      const rNorm = Math.max(0, Math.floor((printableH + state.gapY) / (ch + state.gapY)));
      const xRotStart = w1 + state.gapX;
      const wRem = printableW - xRotStart;
      const cRot = Math.max(0, Math.floor((wRem + state.gapX) / (ch + state.gapX)));
      const rRot = Math.max(0, Math.floor((printableH + state.gapY) / (cw + state.gapY)));
      const total = (cNorm * rNorm) + (cRot * rRot);
      if (total > bestCount) {
        bestCount = total;
        bestCells = [];
        let idx = 0;
        // normal on left
        for (let r = 0; r < rNorm; r++) {
          for (let c = 0; c < cNorm; c++) {
            bestCells.push({
              x: margin + c * (cw + state.gapX),
              y: margin + r * (ch + state.gapY),
              w: cw,
              h: ch,
              isRotated: false,
              cellIdx: idx++
            });
          }
        }
        // rotated on right
        for (let r = 0; r < rRot; r++) {
          for (let c = 0; c < cRot; c++) {
            bestCells.push({
              x: margin + xRotStart + c * (ch + state.gapX),
              y: margin + r * (cw + state.gapY),
              w: ch,
              h: cw,
              isRotated: true,
              cellIdx: idx++
            });
          }
        }
      }
    }

    // Split 2: Vertical split. Rotated left, Normal right
    for (let cRot = 1; cRot <= colsRot; cRot++) {
      const w1 = cRot * ch + (cRot - 1) * state.gapX;
      if (w1 > printableW) continue;
      const rRot = Math.max(0, Math.floor((printableH + state.gapY) / (cw + state.gapY)));
      const xNormStart = w1 + state.gapX;
      const wRem = printableW - xNormStart;
      const cNorm = Math.max(0, Math.floor((wRem + state.gapX) / (cw + state.gapX)));
      const rNorm = Math.max(0, Math.floor((printableH + state.gapY) / (ch + state.gapY)));
      const total = (cRot * rRot) + (cNorm * rNorm);
      if (total > bestCount) {
        bestCount = total;
        bestCells = [];
        let idx = 0;
        // rotated on left
        for (let r = 0; r < rRot; r++) {
          for (let c = 0; c < cRot; c++) {
            bestCells.push({
              x: margin + c * (ch + state.gapX),
              y: margin + r * (cw + state.gapY),
              w: ch,
              h: cw,
              isRotated: true,
              cellIdx: idx++
            });
          }
        }
        // normal on right
        for (let r = 0; r < rNorm; r++) {
          for (let c = 0; c < cNorm; c++) {
            bestCells.push({
              x: margin + xNormStart + c * (cw + state.gapX),
              y: margin + r * (ch + state.gapY),
              w: cw,
              h: ch,
              isRotated: false,
              cellIdx: idx++
            });
          }
        }
      }
    }

    // Split 3: Horizontal split. Normal top, Rotated bottom
    for (let rNorm = 1; rNorm <= rowsNormal; rNorm++) {
      const h1 = rNorm * ch + (rNorm - 1) * state.gapY;
      if (h1 > printableH) continue;
      const cNorm = Math.max(0, Math.floor((printableW + state.gapX) / (cw + state.gapX)));
      const yRotStart = h1 + state.gapY;
      const hRem = printableH - yRotStart;
      const cRot = Math.max(0, Math.floor((printableW + state.gapX) / (ch + state.gapX)));
      const rRot = Math.max(0, Math.floor((hRem + state.gapY) / (cw + state.gapY)));
      const total = (cNorm * rNorm) + (cRot * rRot);
      if (total > bestCount) {
        bestCount = total;
        bestCells = [];
        let idx = 0;
        // normal on top
        for (let r = 0; r < rNorm; r++) {
          for (let c = 0; c < cNorm; c++) {
            bestCells.push({
              x: margin + c * (cw + state.gapX),
              y: margin + r * (ch + state.gapY),
              w: cw,
              h: ch,
              isRotated: false,
              cellIdx: idx++
            });
          }
        }
        // rotated on bottom
        for (let r = 0; r < rRot; r++) {
          for (let c = 0; c < cRot; c++) {
            bestCells.push({
              x: margin + c * (ch + state.gapX),
              y: margin + yRotStart + r * (cw + state.gapY),
              w: ch,
              h: cw,
              isRotated: true,
              cellIdx: idx++
            });
          }
        }
      }
    }

    // Split 4: Horizontal split. Rotated top, Normal bottom
    for (let rRot = 1; rRot <= rowsRot; rRot++) {
      const h1 = rRot * cw + (rRot - 1) * state.gapY;
      if (h1 > printableH) continue;
      const cRot = Math.max(0, Math.floor((printableW + state.gapX) / (ch + state.gapX)));
      const yNormStart = h1 + state.gapY;
      const hRem = printableH - yNormStart;
      const cNorm = Math.max(0, Math.floor((printableW + state.gapX) / (cw + state.gapX)));
      const rNorm = Math.max(0, Math.floor((hRem + state.gapY) / (ch + state.gapY)));
      const total = (cRot * rRot) + (cNorm * rNorm);
      if (total > bestCount) {
        bestCount = total;
        bestCells = [];
        let idx = 0;
        // rotated on top
        for (let r = 0; r < rRot; r++) {
          for (let c = 0; c < cRot; c++) {
            bestCells.push({
              x: margin + c * (ch + state.gapX),
              y: margin + r * (cw + state.gapY),
              w: ch,
              h: cw,
              isRotated: true,
              cellIdx: idx++
            });
          }
        }
        // normal on bottom
        for (let r = 0; r < rNorm; r++) {
          for (let c = 0; c < cNorm; c++) {
            bestCells.push({
              x: margin + c * (cw + state.gapX),
              y: margin + yNormStart + r * (ch + state.gapY),
              w: cw,
              h: ch,
              isRotated: false,
              cellIdx: idx++
            });
          }
        }
      }
    }

    // Perfectly center all computed cells inside the sheet boundary
    if (bestCells.length > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const cell of bestCells) {
        if (cell.x < minX) minX = cell.x;
        if (cell.x + cell.w > maxX) maxX = cell.x + cell.w;
        if (cell.y < minY) minY = cell.y;
        if (cell.y + cell.h > maxY) maxY = cell.y + cell.h;
      }

      const layoutW = maxX - minX;
      const layoutH = maxY - minY;
      const offsetX = (currentSheetW - layoutW) / 2 - minX;
      const offsetY = (currentSheetH - layoutH) / 2 - minY;

      for (const cell of bestCells) {
        cell.x += offsetX;
        cell.y += offsetY;
      }
    }

    const copiesPerSheet = bestCells.length;
    let sheetsNeeded = 0;
    if (copiesPerSheet > 0) {
      if (state.pageDistributionMode === 'repeat' && state.sourceNumPages > 1) {
        const sheetsPerPage = Math.ceil(state.totalCopies / copiesPerSheet);
        sheetsNeeded = numPages * sheetsPerPage;
      } else {
        if (state.sourceNumPages > 1) {
          sheetsNeeded = Math.ceil((numPages * state.totalCopies) / copiesPerSheet);
        } else {
          sheetsNeeded = Math.ceil(state.totalCopies / copiesPerSheet);
        }
      }
    }

    // Sheet area efficiency
    const totalSheetArea = currentSheetW * currentSheetH;
    let totalCopyArea = 0;
    for (const cell of bestCells) {
      totalCopyArea += cell.w * cell.h;
    }
    const efficiencyPercent = totalSheetArea > 0 ? Math.round((totalCopyArea / totalSheetArea) * 1000) / 10 : 0;

    return {
      cols: copiesPerSheet,
      rows: 1,
      copyW: cw,
      copyH: ch,
      isRotated: false,
      copiesPerSheet,
      sheetsNeeded,
      efficiencyPercent,
      placedCells: bestCells
    };
  }

  // --- STANDARD GRID MODES (N-UP, Step & Repeat, Cut & Stack) ---
  let cols = 0;
  let rows = 0;
  let isRotated = false;

  if (state.isGridAuto) {
    // 1. Calculate fitting without rotating copies
    const colsNormal = Math.max(0, Math.floor((printableW + state.gapX) / (cw + state.gapX)));
    const rowsNormal = Math.max(0, Math.floor((printableH + state.gapY) / (ch + state.gapY)));
    const fitNormal = colsNormal * rowsNormal;

    // 2. Calculate fitting with 90° rotation
    const cwRot = ch;
    const chRot = cw;
    const colsRot = Math.max(0, Math.floor((printableW + state.gapX) / (cwRot + state.gapX)));
    const rowsRot = Math.max(0, Math.floor((printableH + state.gapY) / (chRot + state.gapY)));
    const fitRot = colsRot * rowsRot;

    // Decider logic: rotate to optimize if it fits MORE copies, or EQUAL copies (so the user gets visible response when checking)
    if (state.chkAutoRotate && fitRot >= fitNormal) {
      cols = colsRot;
      rows = rowsRot;
      isRotated = true;
    } else {
      cols = colsNormal;
      rows = rowsNormal;
      isRotated = false;
    }
  } else {
    // Manual setup: user forces exact rows/columns
    cols = state.manualCols;
    rows = state.manualRows;
    isRotated = state.chkAutoRotate; // Allow manual 90 deg rotation using the same checkbox!
  }

  const copiesPerSheet = cols * rows;

  let sheetsNeeded = 0;
  if (copiesPerSheet > 0) {
    if (state.pageDistributionMode === 'repeat' && state.sourceNumPages > 1) {
      const sheetsPerPage = Math.ceil(state.totalCopies / copiesPerSheet);
      sheetsNeeded = numPages * sheetsPerPage;
    } else {
      if (state.sourceNumPages > 1) {
        sheetsNeeded = Math.ceil((numPages * state.totalCopies) / copiesPerSheet);
      } else {
        sheetsNeeded = Math.ceil(state.totalCopies / copiesPerSheet);
      }
    }
  }

  // Build the regular grid boxes centered on page
  const cw_cell = isRotated ? ch : cw;
  const ch_cell = isRotated ? cw : ch;
  const gridW = cols * cw_cell + (cols - 1) * state.gapX;
  const gridH = rows * ch_cell + (rows - 1) * state.gapY;
  const startX = (currentSheetW - gridW) / 2;
  const startY = (currentSheetH - gridH) / 2;

  const placedCells: PlacedCell[] = [];
  let cellIdx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      placedCells.push({
        x: startX + c * (cw_cell + state.gapX),
        y: startY + r * (ch_cell + state.gapY),
        w: cw_cell,
        h: ch_cell,
        isRotated,
        cellIdx: cellIdx++
      });
    }
  }

  // Efficiency of printable space
  const totalSheetArea = currentSheetW * currentSheetH;
  const copyAreaOnSheet = copiesPerSheet * cw_cell * ch_cell;
  const efficiencyPercent = totalSheetArea > 0 ? Math.round((copyAreaOnSheet / totalSheetArea) * 1000) / 10 : 0;

  return {
    cols,
    rows,
    copyW: cw,
    copyH: ch,
    isRotated,
    copiesPerSheet,
    sheetsNeeded,
    efficiencyPercent,
    placedCells
  };
}

/**
 * Checks if a horizontal cut at coordinate `y` is safe (i.e. it does not cut through the interior of any card)
 */
export function isSafeHorizontalCut(y: number, cells: PlacedCell[], bleed: number, epsilon = 0.5): boolean {
  for (const cell of cells) {
    const yStart = cell.y + bleed;
    const yEnd = cell.y + cell.h - bleed;
    if (y > yStart + epsilon && y < yEnd - epsilon) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a vertical cut at coordinate `x` is safe (i.e. it does not cut through the interior of any card)
 */
export function isSafeVerticalCut(x: number, cells: PlacedCell[], bleed: number, epsilon = 0.5): boolean {
  for (const cell of cells) {
    const xStart = cell.x + bleed;
    const xEnd = cell.x + cell.w - bleed;
    if (x > xStart + epsilon && x < xEnd - epsilon) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a crop line segment from (x1, y1) to (x2, y2) overlaps with the interior of any card.
 */
export function isCropLineSafe(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cells: PlacedCell[],
  epsilon = 0.05
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (const cell of cells) {
    // Overlap with the interior of the cell.
    const cellMinX = cell.x + epsilon;
    const cellMaxX = cell.x + cell.w - epsilon;
    const cellMinY = cell.y + epsilon;
    const cellMaxY = cell.y + cell.h - epsilon;

    const overlapX = minX < cellMaxX && maxX > cellMinX;
    const overlapY = minY < cellMaxY && maxY > cellMinY;

    if (overlapX && overlapY) {
      return false;
    }
  }
  return true;
}


