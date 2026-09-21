import React from 'react';
import { SizingResult, ProjectInputs } from '../types';
import { Mic, Music, Server, Speaker, ArrowRight, ArrowDown } from 'lucide-react';

interface DiagramProps {
  sizing: SizingResult;
  inputs: ProjectInputs;
}

export function Diagram({ sizing, inputs }: DiagramProps) {
  if (sizing.diagramData.type === 'multi_zone') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 flex flex-col items-center overflow-hidden">
        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-8">
          Diagrama de Conexões (Multi-Zonas)
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-center w-full gap-4 md:gap-8 max-w-5xl">
          {/* Sources */}
          {sizing.diagramData.sources && sizing.diagramData.sources.length > 0 && (
            <>
              <div className="flex flex-row md:flex-col gap-4">
                {sizing.diagramData.sources.map((src, idx) => (
                  <div key={idx} className="bg-white border-2 border-indigo-200 rounded-lg p-4 flex flex-col items-center justify-center w-32 shadow-sm">
                    {src.toLowerCase().includes('paging') ? <Mic className="w-8 h-8 text-indigo-500 mb-2" /> : <Music className="w-8 h-8 text-indigo-500 mb-2" />}
                    <span className="text-xs font-bold text-slate-700 text-center">{src}</span>
                  </div>
                ))}
              </div>
              <div className="hidden md:block text-slate-300"><ArrowRight className="w-8 h-8" /></div>
              <div className="block md:hidden text-slate-300"><ArrowDown className="w-8 h-8" /></div>
            </>
          )}

          {/* DSP */}
          {sizing.diagramData.dspName && (
            <>
              <div className="bg-white border-2 border-[#DF1319] rounded-xl p-6 flex flex-col items-center justify-center w-48 shadow-md relative">
                <div className="absolute -top-3 bg-[#DF1319] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">MATRIZ / CONTROLE</div>
                <Server className="w-12 h-12 text-[#DF1319] mb-3" />
                <span className="text-sm font-bold text-slate-800 text-center">{sizing.diagramData.dspName}</span>
              </div>
              <div className="hidden md:block text-slate-300"><ArrowRight className="w-8 h-8" /></div>
              <div className="block md:hidden text-slate-300"><ArrowDown className="w-8 h-8" /></div>
            </>
          )}

          {/* Amplifiers */}
          {sizing.diagramData.amplifiers && sizing.diagramData.amplifiers.length > 0 && (
            <>
              <div className="flex flex-col gap-3">
                {sizing.diagramData.amplifiers.map((amp, idx) => (
                  <div key={idx} className="bg-white border-2 border-emerald-400 rounded-lg p-3 flex flex-col items-center justify-center w-40 shadow-sm relative">
                    <span className="text-xs font-bold text-slate-700 text-center">{amp}</span>
                  </div>
                ))}
              </div>
              <div className="hidden md:block text-slate-300"><ArrowRight className="w-8 h-8" /></div>
              <div className="block md:hidden text-slate-300"><ArrowDown className="w-8 h-8" /></div>
            </>
          )}

          {/* Zones */}
          {sizing.diagramData.zones && sizing.diagramData.zones.length > 0 && (
            <div className="flex flex-row flex-wrap md:flex-col justify-center gap-3 w-full md:w-auto">
              {sizing.diagramData.zones.map((zone, idx) => (
                <div key={idx} className="bg-white border-2 border-slate-300 rounded-lg p-3 flex items-center gap-3 shadow-sm min-w-[140px]">
                  <Speaker className="w-6 h-6 text-slate-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{zone.name}</span>
                    <span className="text-[10px] text-slate-500">{zone.speakers} caixas ({zone.watts}W)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const { widthMeters, lengthMeters, speakerPositions } = sizing.diagramData;
  if (!widthMeters || !lengthMeters || !speakerPositions) return null;
  
  // Calculate SVG ViewBox based on aspect ratio
  const maxDim = Math.max(widthMeters, lengthMeters);
  const scale = 100 / maxDim; // Map max dimension to 100 SVG units
  
  const svgWidth = widthMeters * scale;
  const svgHeight = lengthMeters * scale;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full flex items-center justify-between mb-4 relative z-10">
        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          Mapa de Calor (Distribuição Estimada)
        </div>
      </div>
      <div 
        className="relative shadow-inner bg-white border-4 border-slate-300" 
        style={{ 
          width: '100%', 
          maxWidth: '600px', 
          aspectRatio: `${widthMeters} / ${lengthMeters}`
        }}
      >
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="heatmapGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="rgba(223, 19, 25, 0.6)" />   {/* Discabos Red */}
              <stop offset="40%" stopColor="rgba(245, 158, 11, 0.4)" />  {/* Orange/Amber */}
              <stop offset="80%" stopColor="rgba(16, 185, 129, 0.15)" /> {/* Greenish fade */}
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />   {/* Transparent */}
            </radialGradient>
            <clipPath id="roomClip">
              <rect width={svgWidth} height={svgHeight} x="0" y="0" />
            </clipPath>
          </defs>
          
          {/* Room Background Grid */}
          <pattern id="grid" width={1 * scale} height={1 * scale} patternUnits="userSpaceOnUse">
            <path d={`M ${1 * scale} 0 L 0 0 0 ${1 * scale}`} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Dimension Lines */}
          {speakerPositions.length > 0 && (
            <g className="text-[3px] fill-slate-500 font-sans font-semibold">
               <line x1="0" y1={speakerPositions[0].y * scale} x2={speakerPositions[0].x * scale} y2={speakerPositions[0].y * scale} stroke="currentColor" strokeWidth="0.3" strokeDasharray="1,1" />
               <text x={(speakerPositions[0].x * scale) / 2} y={speakerPositions[0].y * scale - 1} textAnchor="middle">{speakerPositions[0].x.toFixed(1)}m</text>
               
               {speakerPositions.length > 1 && Math.abs(speakerPositions[0].y - speakerPositions[1].y) < 0.1 && (
                 <>
                   <line x1={speakerPositions[0].x * scale} y1={speakerPositions[0].y * scale} x2={speakerPositions[1].x * scale} y2={speakerPositions[1].y * scale} stroke="currentColor" strokeWidth="0.3" strokeDasharray="1,1" />
                   <text x={((speakerPositions[0].x + speakerPositions[1].x) / 2) * scale} y={speakerPositions[0].y * scale - 1} textAnchor="middle">
                     {Math.abs(speakerPositions[1].x - speakerPositions[0].x).toFixed(1)}m
                   </text>
                 </>
               )}
            </g>
          )}

          {/* Speakers and Coverage */}
          <g clipPath="url(#roomClip)">
            {speakerPositions.map((pos, idx) => (
              <g key={idx}>
                {/* Coverage Area */}
                <circle 
                  cx={pos.x * scale} 
                  cy={pos.y * scale} 
                  r={pos.radius * scale} 
                  fill="url(#heatmapGradient)" 
                />
              </g>
            ))}
          </g>
          
          {speakerPositions.map((pos, idx) => (
            <g key={`dot-${idx}`}>
                <circle 
                  cx={pos.x * scale} 
                  cy={pos.y * scale} 
                  r={0.8} 
                  fill="#1e293b" 
                  stroke="#ffffff"
                  strokeWidth={0.3}
                />
            </g>
          ))}
        </svg>

      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-500 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#DF1319] opacity-60"></span> Nível Alto {sizing.diagramData.estimatedSPL ? `(~${sizing.diagramData.estimatedSPL} dB)` : ''}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 opacity-40"></span> Nível Médio {sizing.diagramData.estimatedSPL ? `(~${sizing.diagramData.estimatedSPL - 3} dB)` : ''}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 opacity-20"></span> Cobertura Mínima {sizing.diagramData.estimatedSPL ? `(~${sizing.diagramData.estimatedSPL - 6} dB)` : ''}
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-400 italic relative z-10">
        As posições no diagrama são sugestões simétricas ideais de grade (Grid-Layout).
      </div>
    </div>
  );
}
