import React from 'react';
import { GridMetrics, AppState } from '../types';
import { Percent, Layers, Copy, Sliders } from 'lucide-react';

interface StatsPanelProps {
  state: AppState;
  metrics: GridMetrics;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ state, metrics }) => {
  const trimWidth = Math.max(0.1, state.copyWidth - (state.chkBleed ? 2 * state.bleedMm : 0));
  const trimHeight = Math.max(0.1, state.copyHeight - (state.chkBleed ? 2 * state.bleedMm : 0));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full select-none">
      
      {/* 1. EFFICIENZA */}
      <div className="bg-white border border-[#e5e1dc] rounded-2xl p-4.5 shadow-3xs hover:border-[#a67472]/40 transition-all duration-300 flex flex-col gap-1 relative overflow-hidden">
        <div className="flex items-center gap-1.5 text-[#8c7674]">
          <Percent className="w-3.5 h-3.5 text-[#a67472]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">% EFFICIENZA</span>
        </div>
        <div className="text-2xl font-black font-mono text-stone-900 leading-none mt-1">
          {metrics.efficiencyPercent}%
        </div>
        <p className="text-[10px] text-stone-500 font-bold mt-1">
          Rapporto carta stampata
        </p>
      </div>

      {/* 2. FOGLI STAMPABILI */}
      <div className="bg-white border border-[#e5e1dc] rounded-2xl p-4.5 shadow-3xs hover:border-[#a67472]/40 transition-all duration-300 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[#8c7674]">
          <Layers className="w-3.5 h-3.5 text-[#a67472]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">FOGLI STAMPABILI</span>
        </div>
        <div className="text-2xl font-black font-mono text-stone-900 leading-none mt-1">
          {metrics.sheetsNeeded} pz
        </div>
        <p className="text-[10px] text-stone-500 font-bold mt-1">
          {metrics.copiesPerSheet} copie per foglio
        </p>
      </div>

      {/* 3. FORMATO COPIA */}
      <div className="bg-white border border-[#e5e1dc] rounded-2xl p-4.5 shadow-3xs hover:border-[#a67472]/40 transition-all duration-300 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[#8c7674]">
          <Copy className="w-3.5 h-3.5 text-[#a67472]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">FORMATO COPIA</span>
        </div>
        <div className="text-2xl font-black font-mono text-stone-900 leading-none mt-1">
          {state.chkBleed ? (
            <span>
              {trimWidth.toFixed(0)} × {trimHeight.toFixed(0)} <span className="text-xs font-semibold text-stone-400">mm</span>
            </span>
          ) : (
            <span>
              {state.copyWidth} × {state.copyHeight} <span className="text-xs font-semibold text-stone-400">mm</span>
            </span>
          )}
        </div>
        <p className="text-[10px] text-stone-500 font-bold mt-1">
          Misure rifilate della resa
        </p>
      </div>

      {/* 4. GRIGLIA CALCOLATA */}
      <div className="bg-white border border-[#e5e1dc] rounded-2xl p-4.5 shadow-3xs hover:border-[#a67472]/40 transition-all duration-300 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[#8c7674]">
          <Sliders className="w-3.5 h-3.5 text-[#a67472]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider">GRIGLIA CALCOLATA</span>
        </div>
        <div className="text-2xl font-black font-mono text-stone-900 leading-none mt-1">
          {state.impositionMode === 'dutch' ? (
            <span className="text-lg">Resa Inclinata</span>
          ) : (
            <span>
              {metrics.cols} × {metrics.rows}
            </span>
          )}
        </div>
        <p className="text-[10px] text-stone-500 font-bold mt-1">
          Colonne x righe d'invio
        </p>
      </div>

    </div>
  );
};
