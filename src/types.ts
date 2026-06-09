/**
 * ImpostoPro - Types and Constants
 */

export const MM_TO_PT = 2.83464567;
export const PT_TO_MM = 1 / 2.83464567;

export type ImpositionMode = 'nup' | 'step' | 'cutstack' | 'dutch';
export type PageDistributionMode = 'collate' | 'repeat';

export interface AppState {
  projectName: string;
  selectedPreset: string;
  sheetWidth: number; // in mm
  sheetHeight: number; // in mm
  isLandscape: boolean;

  copyWidth: number;  // in mm
  copyHeight: number; // in mm

  sourceFileName: string;
  sourceFileBuffer: ArrayBuffer | null;
  sourceNumPages: number;
  sourceWidthPts: number;
  sourceHeightPts: number;
  sourceWidthMm: number;
  sourceHeightMm: number;

  impositionMode: ImpositionMode;
  isGridAuto: boolean;
  manualCols: number;
  manualRows: number;
  marginSheet: number; // in mm
  gapX: number; // in mm
  gapY: number; // in mm
  totalCopies: number;
  userHasEnteredCopies: boolean;

  pageDistributionMode: PageDistributionMode;

  chkCropMarks: boolean;
  chkAutoRotate: boolean;
  chkFillEmpty: boolean;

  chkBleed: boolean;
  bleedMm: number;

  previewSheetIndex: number;
}

export const PRESETS: Record<string, { w: number; h: number }> = {
  'A4': { w: 210, h: 297 },
  'A3': { w: 297, h: 420 },
  'A3+': { w: 329, h: 483 },
  'SRA3': { w: 320, h: 450 },
  'SRA2': { w: 450, h: 640 },
  '32x45': { w: 320, h: 450 },
  '70x100': { w: 700, h: 1000 }
};

export interface PlacedCell {
  x: number; // mm
  y: number; // mm
  w: number; // mm
  h: number; // mm
  isRotated: boolean;
  cellIdx: number;
}

export interface GridMetrics {
  cols: number;
  rows: number;
  copyW: number;
  copyH: number;
  isRotated: boolean;
  copiesPerSheet: number;
  sheetsNeeded: number;
  efficiencyPercent: number;
  placedCells: PlacedCell[];
}
