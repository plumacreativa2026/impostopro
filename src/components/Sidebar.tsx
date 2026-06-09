import React, { useRef } from 'react';
import { AppState, PRESETS, ImpositionMode } from '../types';
import { 
  Upload, FileText, Trash2, Sliders, Layout, 
  ToggleLeft, ToggleRight, Sparkles 
} from 'lucide-react';

interface SidebarProps {
  state: AppState;
  onChange: (updater: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  state,
  onChange,
  onFileSelect,
  onRemoveFile
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const selectPreset = (key: string) => {
    if (key === 'Custom') {
      onChange({ selectedPreset: 'Custom' });
    } else {
      const p = PRESETS[key];
      if (p) {
        onChange({
          selectedPreset: key,
          sheetWidth: p.w,
          sheetHeight: p.h
        });
      }
    }
  };

  const toggleOrientation = () => {
    onChange({ isLandscape: !state.isLandscape });
  };

  const handleImpositionModeChange = (mode: ImpositionMode) => {
    let nextGapX = state.gapX;
    let nextGapY = state.gapY;
    let pageDist = state.pageDistributionMode;

    if (mode === 'nup') {
      pageDist = 'collate';
      nextGapX = 0;
      nextGapY = 0;
    } else if (mode === 'step') {
      pageDist = 'repeat';
      nextGapX = state.gapX === 0 ? 3.0 : state.gapX;
      nextGapY = state.gapY === 0 ? 3.0 : state.gapY;
    } else if (mode === 'cutstack') {
      pageDist = 'collate';
      nextGapX = 0;
      nextGapY = 0;
    } else if (mode === 'dutch') {
      pageDist = 'collate';
      nextGapX = state.gapX === 0 ? 3.0 : state.gapX;
      nextGapY = state.gapY === 0 ? 3.0 : state.gapY;
    }

    onChange({
      impositionMode: mode,
      pageDistributionMode: pageDist,
      gapX: nextGapX,
      gapY: nextGapY,
      userHasEnteredCopies: false
    });
  };

  const getModeDescription = () => {
    switch (state.impositionMode) {
      case 'nup':
        return 'N-UP: Taglio comune (senza gap / 0mm). Ripete sequenzialmente la prima pagina in celle griglia regolari.';
      case 'step':
        return 'STEP & REPEAT: Ripetizione ottimizzata con gap millimetrico per pose distanziate (es. biglietti da visita).';
      case 'cutstack':
        return 'CUT STACK: Taglio comune (senza gap / 0mm). Ordina per pile ordinate verticali per fascicolazione post-taglio immediata.';
      case 'dutch':
        return 'DUTCH CUT: Disposizione guidata che ottimizza il senso della fibra e del taglio, inclinando le pose di 90° se necessario per aumentare la resa.';
    }
  };

  const isZeroGapMode = state.impositionMode === 'nup' || state.impositionMode === 'cutstack';

  return (
    <div className="w-full lg:w-[420px] bg-[#f7f5f0] border-r border-[#e5e1dc] p-5 overflow-y-auto flex flex-col gap-5 scrollbar-thin select-none">
      
      {/* CARD 1: DETTAGLI PDF SORGENTE */}
      <div className="bg-white border border-[#e5e1dc] rounded-2xl p-5 shadow-3xs flex flex-col gap-4">
        <h3 className="text-xs font-display font-black tracking-wider text-stone-500 uppercase flex items-center gap-1.5 select-none">
          <FileText className="w-4 h-4 text-[#a67472]" />
          1. DETTAGLI PDF SORGENTE
        </h3>

        {/* Nome Progetto Input */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider select-none">Nome Progetto</span>
          <input 
            type="text"
            placeholder=""
            value={state.projectName}
            onChange={(e) => onChange({ projectName: e.target.value })}
            className="w-full bg-[#FAF9F6] border border-[#e5e1dc] text-xs font-bold text-stone-800 rounded-lg px-3 py-2 focus:outline-none focus:border-[#a67472] focus:bg-white transition-all shadow-3xs"
          />
        </div>
        
        {state.sourceFileName ? (
          <div className="bg-[#FAF9F6] border border-[#e5e1dc]/80 rounded-xl p-3.5 shadow-3xs flex flex-col gap-3 transition-colors">
            <div className="flex items-start justify-between gap-2 border-b border-[#e5e1dc]/60 pb-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="bg-[#a67472]/10 p-2 rounded-lg text-[#a67472] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold font-mono text-stone-850 truncate" title={state.sourceFileName}>
                    {state.sourceFileName}
                  </h4>
                  <p className="text-[10px] text-stone-500 font-bold font-mono leading-tight mt-0.5">
                    {state.sourceNumPages} {state.sourceNumPages === 1 ? 'pagina' : 'pagine'} · {state.sourceWidthMm} x {state.sourceHeightMm} mm
                  </p>
                </div>
              </div>
              <button 
                onClick={onRemoveFile} 
                className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Rimuovi file sorgente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Manual Dimensions inputs */}
            <div className="grid grid-cols-2 gap-3 mt-0.5">
              <div>
                <span className="text-[9px] font-bold text-stone-400 block uppercase mb-1">Larghezza Copia (mm)</span>
                <div className="relative">
                  <input 
                    type="number"
                    value={state.copyWidth}
                    min="1"
                    step="0.1"
                    onChange={(e) => {
                      const val = Math.max(1, parseFloat(e.target.value) || 1);
                      onChange({ copyWidth: val });
                    }}
                    className="w-full bg-[#FAF9F6] border border-[#e5e1dc] text-xs font-mono font-bold text-stone-800 rounded-lg pl-2.5 pr-8 py-2 focus:outline-none focus:border-[#a67472] focus:bg-white transition-all shadow-3xs"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-[9px] uppercase font-bold">mm</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] font-bold text-stone-400 block uppercase mb-1">Altezza Copia (mm)</span>
                <div className="relative">
                  <input 
                    type="number"
                    value={state.copyHeight}
                    min="1"
                    step="0.1"
                    onChange={(e) => {
                      const val = Math.max(1, parseFloat(e.target.value) || 1);
                      onChange({ copyHeight: val });
                    }}
                    className="w-full bg-[#FAF9F6] border border-[#e5e1dc] text-xs font-mono font-bold text-stone-800 rounded-lg pl-2.5 pr-8 py-2 focus:outline-none focus:border-[#a67472] focus:bg-white transition-all shadow-3xs"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-[9px] uppercase font-bold">mm</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div 
            onClick={triggerFileInput}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-[#e5e1dc] hover:border-[#a67472]/60 bg-[#FAF9F6]/50 hover:bg-[#a67472]/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 gap-2 hover:shadow-3xs group"
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".pdf" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onFileSelect(e.target.files[0]);
                }
              }}
            />
            <div className="bg-[#a67472]/10 p-3 rounded-xl text-[#a67472] group-hover:scale-105 transition-transform duration-300">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-stone-700 font-display">Seleziona un PDF <span className="font-normal text-stone-500">o trascinalo qui</span></p>
            <p className="text-[10px] text-[#8c7674] font-medium leading-normal max-w-[240px] mx-auto">
              PDF tipografico (es. invito, volantino, biglietto)
            </p>
          </div>
        )}

        {/* II PDF include gia il Bleed container */}
        <div className="bg-[#FAF9F6] border border-[#e5e1dc]/80 rounded-2xl p-4 flex flex-col gap-3 mt-0.5 shadow-3xs">
          <label className="flex items-start gap-3 cursor-pointer text-stone-750 select-none">
            <input 
              type="checkbox"
              checked={state.chkBleed}
              onChange={(e) => onChange({ chkBleed: e.target.checked })}
              className="w-5 h-5 mt-0.5 accent-[#2563eb] text-white border-stone-300 rounded-md focus:ring-[#2563eb]"
            />
            <div className="flex flex-col">
              <span className="text-[12px] font-black tracking-tight text-[#2c3e50] leading-snug">Il PDF include gia il Bleed (Abbondanza)</span>
              <span className="text-[10px] text-stone-400 font-semibold leading-normal mt-0.5">Spunta se il file caricato ha gia i margini di abbondanza.</span>
            </div>
          </label>
          
          {state.chkBleed && (
            <div className="flex flex-col gap-3 border-t border-[#e5e1dc]/60 pt-3 anim-fade-in">
              {/* Row with Abbondanza per lato label and compact numeric input box containing mm inside */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black tracking-tight text-[#4a5568]">Abbondanza per lato:</span>
                <div className="relative flex items-center w-24 bg-white border border-[#e5e1dc] rounded-xl px-2.5 py-1.5 shadow-3xs focus-within:border-[#a67472] transition-colors">
                  <input 
                    type="number"
                    min="0"
                    max="15"
                    step="0.5"
                    value={state.bleedMm}
                    onChange={(e) => onChange({ bleedMm: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full text-center text-xs font-black font-mono text-stone-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[9px] font-black text-stone-400 font-mono select-none ml-1">mm</span>
                </div>
              </div>

              {/* Dynamic highlighted Trim Box calculation frame */}
              <div className="bg-[#FEFCE8]/80 border border-[#FEF08A]/80 rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[10.5px] font-bold text-[#451a03]">
                  Misura taglio finito (Trim Box): <span className="font-mono font-black text-[#854d0e]">{(state.copyWidth - 2 * state.bleedMm).toFixed(1)} x {(state.copyHeight - 2 * state.bleedMm).toFixed(1)} mm</span>
                </span>
                <span className="text-[9.5px] text-[#854d0e]/90 font-medium leading-normal">
                  I crocini verranno posizionati arretrati di <span className="font-bold">{state.bleedMm}</span> mm per rifilare il bleed.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CARD 2: CARTA E SUPPORTO DI STAMPA */}
      <div className="bg-white border border-[#e5e1dc] rounded-2xl p-5 shadow-3xs flex flex-col gap-4">
        <h3 className="text-xs font-display font-black tracking-wider text-stone-500 uppercase flex items-center gap-1.5 select-none">
          <Layout className="w-4 h-4 text-[#a67472]" />
          2. CARTA E SUPPORTO DI STAMPA
        </h3>

        <div>
          <span className="text-[10px] font-bold text-stone-400 block uppercase mb-1.5">Formato del Foglio</span>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.keys(PRESETS).map((key) => {
              const isActive = state.selectedPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectPreset(key)}
                  className={`py-1.5 text-xs font-bold border rounded-lg transition-all cursor-pointer ${
                    isActive 
                      ? 'border-[#a67472] bg-[#a67472]/10 text-[#a67472] shadow-3xs' 
                      : 'border-stone-200 bg-white text-stone-605 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  {key}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => selectPreset('Custom')}
              className={`py-1.5 text-xs font-bold border rounded-lg transition-all cursor-pointer ${
                state.selectedPreset === 'Custom' 
                  ? 'border-[#a67472] bg-[#a67472]/10 text-[#a67472] shadow-3xs' 
                  : 'border-stone-200 bg-white text-stone-605 hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Sheet Dimensions Inputs */}
        <div className={`grid grid-cols-2 gap-3 transition-opacity duration-300 ${state.selectedPreset !== 'Custom' ? 'opacity-55' : ''}`}>
          <div>
            <span className="text-[9px] font-bold text-stone-400 block uppercase mb-1">Largh. Foglio (mm)</span>
            <div className="relative">
              <input 
                type="number"
                value={state.sheetWidth}
                disabled={state.selectedPreset !== 'Custom'}
                onChange={(e) => {
                  const val = Math.max(1, parseFloat(e.target.value) || 0);
                  onChange({ sheetWidth: val, selectedPreset: 'Custom' });
                }}
                className="w-full bg-[#FAF9F6] border border-[#e5e1dc] text-xs font-mono font-bold text-stone-800 rounded-lg pl-2.5 pr-8 py-2 focus:outline-none focus:border-[#a67472] disabled:bg-stone-100 disabled:text-stone-400 shadow-3xs animate-none"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-[9px] uppercase font-bold">mm</span>
            </div>
          </div>
          <div>
            <span className="text-[9px] font-bold text-stone-400 block uppercase mb-1">Alt. Foglio (mm)</span>
            <div className="relative">
              <input 
                type="number"
                value={state.sheetHeight}
                disabled={state.selectedPreset !== 'Custom'}
                onChange={(e) => {
                  const val = Math.max(1, parseFloat(e.target.value) || 0);
                  onChange({ sheetHeight: val, selectedPreset: 'Custom' });
                }}
                className="w-full bg-[#FAF9F6] border border-[#e5e1dc] text-xs font-mono font-bold text-stone-800 rounded-lg pl-2.5 pr-8 py-2 focus:outline-none focus:border-[#a67472] disabled:bg-stone-100 disabled:text-stone-400 shadow-3xs animate-none"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-[9px] uppercase font-bold">mm</span>
            </div>
          </div>
        </div>

        {/* Orientation Toggle Button */}
        <div className="flex items-center justify-between border-t border-[#e5e1dc]/60 pt-3 mt-0.5">
          <span className="text-xs font-bold text-stone-700">Orientamento Orizzontale</span>
          <button 
            type="button"
            onClick={toggleOrientation}
            className="text-[#a67472] hover:bg-stone-50 p-1 rounded-lg transition-colors cursor-pointer"
            title="Cambia orientamento foglio"
          >
            {state.isLandscape ? (
              <ToggleRight className="w-8 h-8 text-[#a67472]" style={{ width: '32px', height: '32px' }} />
            ) : (
              <ToggleLeft className="w-8 h-8 text-stone-300" style={{ width: '32px', height: '32px' }} />
            )}
          </button>
        </div>
      </div>

      {/* CARD 3: MODALITÀ DI IMPOSIZIONE */}
      <div className="bg-white border border-[#e5e1dc] rounded-2xl p-5 shadow-3xs flex flex-col gap-4">
        <h3 className="text-xs font-display font-black tracking-wider text-stone-500 uppercase flex items-center gap-1.5 select-none">
          <Sliders className="w-4 h-4 text-[#a67472]" />
          3. MODALITÀ DI IMPOSIZIONE
        </h3>

        {/* 4 buttons Grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {(['nup', 'step', 'cutstack', 'dutch'] as ImpositionMode[]).map((mode) => {
            const isActive = state.impositionMode === mode;
            let label = '';
            if (mode === 'nup') label = 'N-UP';
            if (mode === 'step') label = 'STEP & REPEAT';
            if (mode === 'cutstack') label = 'CUT STACK';
            if (mode === 'dutch') label = 'DUTCH CUT';

            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleImpositionModeChange(mode)}
                className={`py-2 text-[11px] font-black border rounded-lg transition-all cursor-pointer ${
                  isActive 
                    ? 'border-[#a67472] bg-[#a67472]/85 text-white shadow-3xs' 
                    : 'border-stone-200 bg-white text-stone-605 hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Short italic description */}
        <p className="text-[10px] text-stone-500 italic leading-relaxed font-semibold bg-[#FAF9F6] border border-[#e5e1dc]/80 px-3 py-2 rounded-xl mt-0.5">
          {getModeDescription()}
        </p>

        {/* Auto grid toggle */}
        {state.impositionMode !== 'dutch' && (
          <div className="flex flex-col gap-3 border-t border-[#e5e1dc]/60 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Calcolo Griglia Automatico</span>
              <button 
                type="button"
                onClick={() => onChange({ isGridAuto: !state.isGridAuto })}
                className="text-[#a67472] hover:bg-stone-50 p-1 rounded-lg transition-colors cursor-pointer"
              >
                {state.isGridAuto ? (
                  <ToggleRight className="w-8 h-8 text-[#a67472]" style={{ width: '32px', height: '32px' }} />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-stone-300" style={{ width: '32px', height: '32px' }} />
                )}
              </button>
            </div>

            {/* Manual block inputs */}
            {!state.isGridAuto && (
              <div className="grid grid-cols-2 gap-2 anim-fade-in">
                <div>
                  <span className="text-[9px] font-bold text-stone-400 block uppercase mb-1">Colonne Manuali</span>
                  <input 
                    type="number"
                    value={state.manualCols}
                    min="1"
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      onChange({ manualCols: val });
                    }}
                    className="w-full bg-white border border-stone-200 text-xs font-bold font-mono rounded-lg px-2.5 py-1.5 text-stone-800 focus:outline-none focus:border-[#a67472]"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-stone-400 block uppercase mb-1">Righe Manuali</span>
                  <input 
                    type="number"
                    value={state.manualRows}
                    min="1"
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      onChange({ manualRows: val });
                    }}
                    className="w-full bg-white border border-stone-200 text-xs font-bold font-mono rounded-lg px-2.5 py-1.5 text-stone-800 focus:outline-none focus:border-[#a67472]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sliders for margin, gapX, gapY */}
        <div className="flex flex-col gap-3 border-t border-[#e5e1dc]/60 pt-3">
          
          {/* Margin Sheet */}
          <div>
            <div className="flex justify-between items-center text-xs text-stone-650 mb-1">
              <span className="font-bold">Margine Esterno Foglio</span>
              <span className="font-bold text-[#a67472] font-mono">{state.marginSheet} mm</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="range"
                min="0"
                max="50"
                step="1"
                value={state.marginSheet}
                onChange={(e) => onChange({ marginSheet: parseFloat(e.target.value) || 0 })}
                className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#a67472]"
              />
              <input 
                type="number"
                min="0"
                max="50"
                value={state.marginSheet}
                onChange={(e) => onChange({ marginSheet: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-12 text-center bg-white border border-stone-200 text-[11px] font-mono font-bold rounded px-1 py-0.5 focus:outline-none text-stone-800"
              />
            </div>
          </div>

          {/* Gap X */}
          <div>
            <div className="flex justify-between items-center text-xs text-stone-650 mb-1">
              <span className="font-bold">Distanziatore Orizzontale (Gap x)</span>
              <span className={`font-mono font-bold text-[11px] ${isZeroGapMode ? 'text-stone-400' : 'text-[#a67472]'}`}>
                {isZeroGapMode ? '0 mm (Taglio Comune)' : `${state.gapX} mm`}
              </span>
            </div>
            <div className={`flex items-center gap-2 ${isZeroGapMode ? 'opacity-40 pointer-events-none' : ''}`}>
              <input 
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={state.gapX}
                disabled={isZeroGapMode}
                onChange={(e) => onChange({ gapX: parseFloat(e.target.value) || 0 })}
                className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#a67472]"
              />
              <input 
                type="number"
                min="0"
                value={isZeroGapMode ? 0 : state.gapX}
                disabled={isZeroGapMode}
                onChange={(e) => onChange({ gapX: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-12 text-center bg-white border border-stone-200 text-[11px] font-mono font-bold rounded px-1 py-0.5 focus:outline-none text-stone-800"
              />
            </div>
          </div>

          {/* Gap Y */}
          <div>
            <div className="flex justify-between items-center text-xs text-stone-650 mb-1">
              <span className="font-bold">Distanziatore Verticale (Gap y)</span>
              <span className={`font-mono font-bold text-[11px] ${isZeroGapMode ? 'text-stone-400' : 'text-[#a67472]'}`}>
                {isZeroGapMode ? '0 mm (Taglio Comune)' : `${state.gapY} mm`}
              </span>
            </div>
            <div className={`flex items-center gap-2 ${isZeroGapMode ? 'opacity-40 pointer-events-none' : ''}`}>
              <input 
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={state.gapY}
                disabled={isZeroGapMode}
                onChange={(e) => onChange({ gapY: parseFloat(e.target.value) || 0 })}
                className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#a67472]"
              />
              <input 
                type="number"
                min="0"
                value={isZeroGapMode ? 0 : state.gapY}
                disabled={isZeroGapMode}
                onChange={(e) => onChange({ gapY: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-12 text-center bg-white border border-stone-200 text-[11px] font-mono font-bold rounded px-1 py-0.5 focus:outline-none text-stone-850"
              />
            </div>
          </div>
        </div>

        {/* Volume - Numero Totale di Copie Richieste */}
        <div className="border-t border-[#e5e1dc]/60 pt-3">
          <span className="text-[10px] font-bold text-stone-400 block uppercase mb-1">
            Numero Totale di Copie Richieste
          </span>
          <input 
            type="number"
            value={state.totalCopies}
            min="1"
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value) || 1);
              onChange({ 
                totalCopies: val,
                userHasEnteredCopies: true
              });
            }}
            className="w-full bg-[#FAF9F6] border border-[#e5e1dc] text-sm font-bold rounded-xl px-3 py-2.5 font-mono text-stone-800 focus:outline-none focus:border-[#a67472] focus:bg-white shadow-3xs"
          />
          <p className="text-[9px] text-[#8c7674] mt-1.5 font-bold leading-normal">
            Default impostato in base alla capienza di 1 foglio di stampa.
          </p>
        </div>

        {/* Multi-page layout options inside Card 3 */}
        {state.sourceNumPages > 1 && (
          <div className="flex flex-col gap-2 bg-[#FAF9F6] border border-[#e5e1dc]/80 rounded-xl p-3 shadow-3xs">
            <span className="text-[10px] font-bold text-stone-500 uppercase block">Distribuzione Pagine</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ pageDistributionMode: 'collate', userHasEnteredCopies: false })}
                className={`py-1.5 text-[10px] font-bold border rounded-lg transition-all cursor-pointer ${
                  state.pageDistributionMode === 'collate' 
                    ? 'border-[#a67472] bg-[#a67472]/10 text-[#a67472]' 
                    : 'border-stone-200 text-stone-605 bg-white hover:bg-stone-50'
                }`}
              >
                Set Sequenziali (Collate)
              </button>
              <button
                type="button"
                onClick={() => onChange({ pageDistributionMode: 'repeat', userHasEnteredCopies: false })}
                className={`py-1.5 text-[10px] font-bold border rounded-lg transition-all cursor-pointer ${
                  state.pageDistributionMode === 'repeat' 
                    ? 'border-[#a67472] bg-[#a67472]/10 text-[#a67472]' 
                    : 'border-stone-200 text-stone-605 bg-white hover:bg-stone-50'
                }`}
              >
                Ripeti Pagina (Blocks)
              </button>
            </div>
            <p className="text-[9px] text-[#8c7674] font-medium leading-normal leading-relaxed">
              {state.pageDistributionMode === 'collate' 
                ? 'Ordina le copie delle pagine per fascicoli consecutivi (Set 1 Pag 1,2... Set 2...)' 
                : 'Stampa raggruppando copertine o pagine separate su fogli dedicati.'}
            </p>
          </div>
        )}
      </div>

      {/* CARD 4: SEGNI E OTTIMIZZAZIONI */}
      <div className="bg-white border border-[#e5e1dc] rounded-2xl p-5 shadow-3xs flex flex-col gap-4">
        <h3 className="text-xs font-display font-black tracking-wider text-stone-500 uppercase flex items-center gap-1.5 select-none">
          <Sparkles className="w-4 h-4 text-[#a67472]" />
          4. SEGNI E OTTIMIZZAZIONI
        </h3>

        <div className="flex flex-col gap-3">
          {/* Include Crop Marks */}
          <label className="flex items-start gap-2.5 cursor-pointer text-stone-750 select-none hover:bg-[#FAF9F6]/40 p-1 rounded-lg transition-colors">
            <input 
              type="checkbox"
              checked={state.chkCropMarks}
              onChange={(e) => onChange({ chkCropMarks: e.target.checked })}
              className="w-4 h-4 mt-0.5 accent-[#a67472] text-[#a67472] border-stone-300 rounded focus:ring-[#a67472]"
            />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-stone-850">Disegna Segni di Taglio (Crocini)</span>
              <span className="text-[9px] text-stone-400 leading-normal mt-0.5">Disegna linee guida esterne (3mm, offset 2mm, colore Registration) per taglierina.</span>
            </div>
          </label>

          {/* Auto Rotate Copies */}
          <label className="flex items-start gap-2.5 cursor-pointer text-stone-750 select-none hover:bg-[#FAF9F6]/40 p-1 rounded-lg transition-colors">
            <input 
              type="checkbox"
              checked={state.chkAutoRotate}
              disabled={!state.isGridAuto || state.impositionMode === 'dutch'}
              onChange={(e) => onChange({ chkAutoRotate: e.target.checked })}
              className="w-4 h-4 mt-0.5 accent-[#a67472] text-[#a67472] border-stone-300 rounded focus:ring-[#a67472] disabled:opacity-40"
            />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-stone-850">Ottimizza Rotazione Copie (Auto-ruota)</span>
              <span className="text-[9px] text-stone-400 leading-normal mt-0.5">Ruota le copie di 90° per incrementare la massima resa del supporto di stampa.</span>
            </div>
          </label>

          {/* Ottimizza spazi vuoti */}
          <label className="flex items-start gap-2.5 cursor-pointer text-stone-750 select-none hover:bg-[#FAF9F6]/40 p-1 rounded-lg transition-colors">
            <input 
              type="checkbox"
              checked={state.chkFillEmpty}
              onChange={(e) => onChange({ chkFillEmpty: e.target.checked })}
              className="w-4 h-4 mt-0.5 accent-[#a67472] text-[#a67472] border-stone-300 rounded focus:ring-[#a67472]"
            />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-stone-850 flex items-center gap-1.5 flex-wrap">
                Ottimizza spazi vuoti 
                <span className="text-[#a67472] text-[9px] font-bold uppercase font-mono bg-[#a67472]/10 px-1.5 py-0.5 rounded-md leading-none">
                  Ideale per campionari
                </span>
              </span>
              <span className="text-[9px] text-[#8c7674] font-medium leading-normal mt-1 border-l-2 border-[#a67472]/20 pl-2">
                Le posizioni vuote dell&apos;ultimo foglio vengono riempite con copie extra dello stesso prodotto. Perfetto per avere campioni o scorte aggiuntive.
              </span>
            </div>
          </label>
        </div>
      </div>

    </div>
  );
};
