import { useState, useDeferredValue } from 'react';
import { AppState, GridMetrics } from './types';
import { calculateGridMetrics } from './utils/imposition';
import { loadPDFMetadata, renderPDFPageToCanvas, generateImposedPDF, clearPdfCache } from './utils/pdfHelper';
import { Sidebar } from './components/Sidebar';
import { PreviewCanvas } from './components/PreviewCanvas';
import { StatsPanel } from './components/StatsPanel';
import { 
  FileDown, RotateCcw, AlertCircle, Layers 
} from 'lucide-react';

export default function App() {
  // 1. Core Reactive Application State
  const [state, setState] = useState<AppState>({
    projectName: '',
    selectedPreset: 'SRA3',
    sheetWidth: 320,
    sheetHeight: 450,
    isLandscape: false,

    copyWidth: 100,
    copyHeight: 150,

    sourceFileName: '',
    sourceFileBuffer: null,
    sourceNumPages: 0,
    sourceWidthPts: 0,
    sourceHeightPts: 0,
    sourceWidthMm: 0,
    sourceHeightMm: 0,

    impositionMode: 'nup',
    isGridAuto: true,
    manualCols: 2,
    manualRows: 3,
    marginSheet: 5,
    gapX: 3,
    gapY: 3,
    totalCopies: 8,
    userHasEnteredCopies: false,

    pageDistributionMode: 'collate',

    chkCropMarks: true,
    chkAutoRotate: true,
    chkFillEmpty: false,

    chkBleed: false,
    bleedMm: 2.0,

    previewSheetIndex: 0
  });

  // 2. Auxiliary UI States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // High-performance lazy page-rendering caches
  const [pageCache, setPageCache] = useState<Record<number, HTMLCanvasElement>>({});
  const [renderingPages, setRenderingPages] = useState<Record<number, boolean>>({});

  // 3. Deferred evaluation for heavy grid geometric calculation
  const deferredState = useDeferredValue(state);
  const metrics: GridMetrics = calculateGridMetrics(deferredState);

  // Synchronise automatic copies if grid updates and user hasn't typed in a manual amount
  const copiesPerSheet = metrics.copiesPerSheet;
  if (!state.userHasEnteredCopies) {
    let desiredCopies = 8;
    if (state.sourceNumPages > 1 && state.pageDistributionMode === 'collate') {
      desiredCopies = 1;
    } else {
      desiredCopies = copiesPerSheet > 0 ? copiesPerSheet : 1;
    }
    if (state.totalCopies !== desiredCopies) {
      setState(prev => ({
        ...prev,
        totalCopies: desiredCopies
      }));
    }
  }

  // 4. State updates coordination
  const handleStateChange = (updater: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...prev, ...next };
    });
  };

  // 5. Load standard selected PDF file
  const handleFileSelect = async (file: File) => {
    try {
      setIsLoading(true);
      setLoadingText('Analisi del file PDF e calcolo delle coordinate...');
      setErrorMessage('');

      // Extract basic PDF specs & metadata using the compiled pdfHelper
      const meta = await loadPDFMetadata(file);

      // Deep clone file buffer to local state
      const buffer = await file.arrayBuffer();

      // Reset caches
      setPageCache({ 1: meta.renderedImage });
      setRenderingPages({});

      // Set state attributes
      setState(prev => ({
        ...prev,
        sourceFileName: file.name,
        projectName: prev.projectName || file.name.replace(/\.[^/.]+$/, ""),
        sourceFileBuffer: buffer,
        sourceNumPages: meta.numPages,
        sourceWidthPts: meta.widthPts,
        sourceHeightPts: meta.heightPts,
        sourceWidthMm: meta.widthMm,
        sourceHeightMm: meta.heightMm,

        // Synchronise default copy size to loaded PDF page dimensions
        copyWidth: meta.widthMm,
        copyHeight: meta.heightMm,
        previewSheetIndex: 0,
        userHasEnteredCopies: false // recalculate copies automatically
      }));

      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      setErrorMessage(err.message || 'Errore nel caricamento del file PDF sorgente.');
    }
  };

  // 6. Delete loaded document
  const handleRemoveFile = () => {
    clearPdfCache();
    setPageCache({});
    setRenderingPages({});
    setErrorMessage('');
    setState(prev => ({
      ...prev,
      projectName: '',
      sourceFileName: '',
      sourceFileBuffer: null,
      sourceNumPages: 0,
      sourceWidthPts: 0,
      sourceHeightPts: 0,
      sourceWidthMm: 0,
      sourceHeightMm: 0,
      previewSheetIndex: 0,
      userHasEnteredCopies: false
    }));
  };

  // 7. Lazy loading of page images to render inside Preview Board
  const triggerLazyPageRender = async (pageNumber: number) => {
    if (pageCache[pageNumber] || renderingPages[pageNumber] || !state.sourceFileBuffer) {
      return;
    }

    setRenderingPages(prev => ({ ...prev, [pageNumber]: true }));

    try {
      const pageCanvas = await renderPDFPageToCanvas(state.sourceFileBuffer, pageNumber);
      setPageCache(prev => ({ ...prev, [pageNumber]: pageCanvas }));
    } catch (err) {
      console.error(`Error rendering page ${pageNumber}:`, err);
    } finally {
      setRenderingPages(prev => ({ ...prev, [pageNumber]: false }));
    }
  };

  // 8. Reset to standard template margins
  const handleResetDefaults = () => {
    handleRemoveFile();
    setState({
      projectName: '',
      selectedPreset: 'SRA3',
      sheetWidth: 320,
      sheetHeight: 450,
      isLandscape: false,

      copyWidth: 100,
      copyHeight: 150,

      sourceFileName: '',
      sourceFileBuffer: null,
      sourceNumPages: 0,
      sourceWidthPts: 0,
      sourceHeightPts: 0,
      sourceWidthMm: 0,
      sourceHeightMm: 0,

      impositionMode: 'nup',
      isGridAuto: true,
      manualCols: 2,
      manualRows: 3,
      marginSheet: 5,
      gapX: 3,
      gapY: 3,
      totalCopies: 8,
      userHasEnteredCopies: false,

      pageDistributionMode: 'collate',

      chkCropMarks: true,
      chkAutoRotate: true,
      chkFillEmpty: false,

      chkBleed: false,
      bleedMm: 2.0,

      previewSheetIndex: 0
    });
  };

  // 9. Run final imposition schemas composition & download
  const handleExportPDFResult = async () => {
    if (!state.sourceFileBuffer) {
      setErrorMessage('Carica un file PDF sorgente prima di procedere con l&apos;esportazione.');
      return;
    }

    try {
      setIsLoading(true);
      setLoadingText('Composizione delle pagine e disegno vettoriale dei crocini...');
      
      const pdfBytes = await generateImposedPDF(state, metrics);
      
      // Trigger download pipeline
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      
      // Filename construction
      let finalFileName = 'progetto-imposted.pdf';
      if (state.projectName && state.projectName.trim()) {
        const sanitized = state.projectName.trim().replace(/[/\\?%*:|"<>]/g, '_');
        finalFileName = `${sanitized}-imposted.pdf`;
      } else if (state.sourceFileName) {
        const baseName = state.sourceFileName.replace(/\.[^/.]+$/, "");
        finalFileName = `${baseName}-imposted.pdf`;
      } else {
        const timestamp = new Date().toISOString().slice(0, 10);
        finalFileName = `imposizione_${state.impositionMode}_${timestamp}-imposted.pdf`;
      }
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      setErrorMessage(err.message || 'Errore nella generazione del file PDF finale.');
    }
  };

  return (
    <div className="flex flex-col h-screen text-stone-800 bg-[#f7f5f0] font-sans overflow-hidden">
      
      {/* PROFESSIONAL APPLICATION HEADER */}
      <header className="h-16 px-6 bg-white text-stone-900 flex items-center justify-between select-none border-b border-[#e5e1dc] shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="bg-[#a67472]/5 p-2.5 rounded-2xl text-[#a67472] flex items-center justify-center border border-[#a67472]/10">
            <Layers className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-display tracking-tight uppercase">
                <span className="font-black text-[#a67472]">IMPOSTO</span>
                <span className="font-light text-[#a67472]">PRO</span>
              </h1>
            </div>
            <p className="text-[9px] text-[#8c7674]/80 font-mono font-bold uppercase tracking-widest leading-none mt-1">
              Strumento Professionale di Imposizione PDF
            </p>
          </div>
        </div>

        {/* Global Action Header Items */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-stone-605 bg-white border border-[#e5e1dc] hover:border-stone-300 rounded-xl transition-all font-semibold shadow-3xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          
          <button
            onClick={handleExportPDFResult}
            disabled={!state.sourceFileBuffer}
            className="flex items-center gap-1.5 px-4.5 py-1.5 text-xs font-bold text-white bg-[#a67472] hover:bg-[#a67472]/90 disabled:bg-stone-105 disabled:text-stone-300 rounded-xl transition-all shadow-3xs cursor-pointer disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" />
            <span>Esporta PDF</span>
          </button>
        </div>
      </header>

      {/* WORKBENCH BODY VIEW */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR SETTINGS BAR */}
        <Sidebar 
          state={state}
          onChange={handleStateChange}
          onFileSelect={handleFileSelect}
          onRemoveFile={handleRemoveFile}
        />

        {/* WORKSPACE PREVIEW FRAME */}
        <main className="flex-1 flex flex-col p-6 overflow-y-auto gap-6 scrollbar-thin bg-stone-50/50">

          {/* IF NO FILE LOADED: WORKFLOW GUIDE PANEL */}
          {!state.sourceFileBuffer && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none bg-stone-100/50 border border-[#e5e1dc] rounded-3xl p-6">
              
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="bg-[#a67472]/10 text-[#a67472] w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold font-mono text-sm shadow-3xs">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-850">Carica il File PDF</h4>
                  <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                    Importa una locandina, un biglietto da visita o un libro. Il sistema calcola istantaneamente le dimensioni del manufatto originale.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="bg-[#a67472]/10 text-[#a67472] w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold font-mono text-sm shadow-3xs">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-850">Scegli Formato e Imposizione</h4>
                  <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                    Definisci il formato della carta macchina (es. SRA3) e seleziona il modello di taglio comune, con gap o l&apos;ottimizzatore automatico Dutch Cut.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="bg-[#a67472]/10 text-[#a67472] w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold font-mono text-sm shadow-3xs">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-850">Controlla ed Esporta</h4>
                  <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                    Sfoglia i fogli macchina proposti, verifica l&apos;abbondanza e scarica il file stampabile ad altissima risoluzione munito dei crocini di registro.
                  </p>
                </div>
              </div>

            </div>
          )}
          
          {/* TOP CONFIGURATION DESCRIPTION & DIGITAL FOGLI BADGE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#a67472] uppercase block">
                CONFIGURAZIONE RESA OTTIMIZZATA
              </span>
              <h2 className="text-xl font-black text-stone-900 mt-1 leading-tight">
                {metrics.placedCells.length} Copie / {state.selectedPreset} ({state.isLandscape ? 'Orizzontale' : 'Verticale'})
              </h2>
              <p className="text-xs text-stone-500 mt-1.5 font-bold">
                Efficienza carta: {metrics.efficiencyPercent}% · {state.totalCopies} copie totali richiedono {metrics.sheetsNeeded} foglio/i.
              </p>
            </div>

            {/* FOGLI TOTALI BADGE */}
            <div className="bg-white border border-[#e5e1dc] rounded-2xl flex items-center shadow-3xs overflow-hidden h-14 select-none self-start sm:self-auto">
              {/* Left text */}
              <div className="px-5 py-2 flex flex-col justify-center text-right shrink-0">
                <span className="text-[8px] font-bold font-mono tracking-widest text-[#8c7674] uppercase">FOGLI TOTALI</span>
                <span className="text-[11px] font-black text-stone-850 font-mono mt-0.5">{metrics.sheetsNeeded} PZ RICHIESTI</span>
              </div>
              {/* Right solid badge */}
              <div className="bg-[#a67472] text-white px-4 h-full flex flex-col items-center justify-center text-center shrink-0 min-w-[64px]">
                <span className="text-xl font-black font-mono leading-none">{metrics.sheetsNeeded}</span>
                <span className="text-[7px] font-bold font-mono tracking-wider uppercase mt-1 leading-none">FOGLI</span>
              </div>
            </div>
          </div>

          {/* DYNAMIC ERROR ALERTS PANEL */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-medium flex items-center gap-3 anim-slide-in shadow-3xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* DYNAMIC VISUAL SHEET PREVIEW WORKSPACE */}
          <div className="bg-white border border-[#e5e1dc] rounded-3xl p-6 shadow-3xs flex flex-col">
            <PreviewCanvas 
              state={state}
              metrics={metrics}
              pageCache={pageCache}
              onSheetChange={(newIndex) => handleStateChange({ previewSheetIndex: newIndex })}
              triggerLazyPageRender={triggerLazyPageRender}
            />
          </div>

          {/* STATS BADGES PANEL */}
          <StatsPanel state={deferredState} metrics={metrics} />

          {/* TECHNICAL COMPLIANT BANNER */}
          <div className="bg-white border border-[#e5e1dc] rounded-2xl p-5 shadow-3xs select-none">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8c7674] mb-2 flex items-center gap-1.5 border-b border-[#e5e1dc]/50 pb-2 w-full">
              <AlertCircle className="w-3.5 h-3.5 text-[#a67472]" />
              Nota tecnica per la stampa professionale:
            </h4>
            <ul className="list-disc pl-4 text-[11px] text-[#8c7674] leading-relaxed flex flex-col gap-2 font-semibold">
              <li>
                I crocini di taglio Registration usano il colore nero di registrazione 100% per risultare visibili su tutte le lastre di separazione CMYK.
              </li>
              <li>
                Le modalità <strong className="text-stone-700">Cut Stack</strong> e <strong className="text-stone-700">Dutch Cut</strong> sono pensate per la fascicolazione automatica post-taglio orizzontale o verticale, permettendo di impilare le risme in sequenza ordinata immediata.
              </li>
            </ul>
          </div>
          {/* CREDITS FOOTER */}
          <footer className="mt-8 text-center select-none pb-4 border-t border-[#e5e1dc]/30 pt-6">
            <p className="text-xs font-semibold text-[#8c7674]">
              Fold Method
            </p>
            <p className="text-[11px] text-[#8c7674]/80 mt-1">
              © 2026 Imposto PRO - Tutti i diritti riservati.
            </p>
          </footer>

        </main>
      </div>

      {/* FULL-SCREEN GLASS LOADER OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 select-none">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-stone-200 flex flex-col items-center justify-center text-center gap-4 animate-scale-up">
            <div className="w-12 h-12 border-4 border-stone-250 border-t-[#a67472] rounded-full animate-spin"></div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Elaborazione Tipografica</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">{loadingText}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
