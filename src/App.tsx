import React, { useState } from 'react';
import FrontendView from './views/FrontendView';
import AdminView from './views/AdminView';
import { Monitor, Settings, Download } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'frontend' | 'admin'>('frontend');

  const handleDownload = () => {
    window.location.href = '/api/download-plugin';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Dev Mode Toolbar - only to toggle views in this preview */}
      <div className="bg-slate-900 text-white p-2 flex justify-center items-center gap-4 text-sm font-medium z-50 shadow-md sticky top-0 flex-wrap">
        <span className="text-slate-400 mr-4 font-bold text-xs uppercase tracking-wider">Modo Previsualização:</span>
        <button 
          onClick={() => setView('frontend')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${view === 'frontend' ? 'bg-[#DF1319] text-white shadow-inner' : 'hover:bg-slate-800 text-slate-300'}`}
        >
          <Monitor className="w-4 h-4" />
          Frontend (Shortcode [dimensionador_de_audio])
        </button>
        <button 
          onClick={() => setView('admin')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${view === 'admin' ? 'bg-[#DF1319] text-white shadow-inner' : 'hover:bg-slate-800 text-slate-300'}`}
        >
          <Settings className="w-4 h-4" />
          Admin WordPress (Configurações)
        </button>
        <div className="w-px h-6 bg-slate-700 mx-2"></div>
        <button 
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-1.5 rounded transition-colors bg-emerald-600 hover:bg-emerald-500 text-white shadow font-bold"
          title="Baixar plugin estruturado em .zip"
        >
          <Download className="w-4 h-4" />
          Baixar Plugin (.zip)
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        {view === 'frontend' ? <FrontendView /> : <AdminView />}
      </div>
    </div>
  );
}
