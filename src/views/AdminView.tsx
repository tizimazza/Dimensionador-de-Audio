import React, { useState, useEffect } from 'react';
import { WPSettings } from '../types';
import { Settings, Save, CheckCircle2, List } from 'lucide-react';
import { INITIAL_SIZING_CONFIG } from '../data/sizingConfig';

export default function AdminView() {
  const [settings, setSettings] = useState<WPSettings>({
    copyEmail: '',
    colorPrimary: '#df1319',
    colorSecondary: '#9ebf24',
    productSkus: {}
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Collect all products from the config to generate the fields
  const allProducts = [
    ...INITIAL_SIZING_CONFIG.speakerCatalog,
    ...INITIAL_SIZING_CONFIG.amplifierCatalog,
    ...INITIAL_SIZING_CONFIG.accessoryCatalog
  ];

  useEffect(() => {
    // Carregar do ambiente (no WP real isso vem do wp_localize_script via window.workproCalcSettings)
    const wpSettings = (window as any).workproCalcSettings;
    if (wpSettings) {
       setSettings({
          copyEmail: wpSettings.copyEmail || '',
          colorPrimary: wpSettings.colorPrimary || '#df1319',
          colorSecondary: wpSettings.colorSecondary || '#9ebf24',
          productSkus: wpSettings.productSkus || {}
       });
       return;
    }

    // Fallback: Carregar do localStorage no ambiente de preview/dev
    const savedSettings = localStorage.getItem('workpro_wp_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {}
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // No ambiente WordPress Real
    const wpSettings = (window as any).workproCalcSettings;
    if (wpSettings && wpSettings.ajaxUrl) {
       try {
          await fetch(wpSettings.ajaxUrl + 'settings', {
             method: 'POST',
             headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
             },
             body: JSON.stringify(settings)
          });
       } catch (e) {
          console.error('Failed to save via REST API', e);
       }
    } else {
       // Simular no Preview Local
       await new Promise(resolve => setTimeout(resolve, 800));
       localStorage.setItem('workpro_wp_settings', JSON.stringify(settings));
    }

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (field: keyof WPSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleProductSkuChange = (id: string, value: string) => {
    setSettings(prev => ({
       ...prev,
       productSkus: {
          ...prev.productSkus,
          [id]: value
       }
    }));
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 my-8">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-700">
          <Settings size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configurações do Plugin</h2>
          <p className="text-slate-500 text-sm">Ajustes gerais para a Calculadora Workpro / Discabos</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">E-mail para Cópia Oculta</label>
          <p className="text-xs text-slate-500 mb-2">E-mail que receberá os orçamentos solicitados pelos clientes no frontend.</p>
          <input 
            type="email" 
            value={settings.copyEmail}
            onChange={e => handleChange('copyEmail', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#DF1319]"
            placeholder="vendas@discabos.com.br"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Cor Primária (Seleções e Destaques)</label>
            <p className="text-xs text-slate-500 mb-2">Padrão: #df1319</p>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={settings.colorPrimary}
                onChange={e => handleChange('colorPrimary', e.target.value)}
                className="w-10 h-10 border-0 p-0 rounded-lg cursor-pointer"
              />
              <input 
                type="text" 
                value={settings.colorPrimary}
                onChange={e => handleChange('colorPrimary', e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg uppercase"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Cor Secundária (Botões de Ação)</label>
            <p className="text-xs text-slate-500 mb-2">Padrão: #9ebf24</p>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={settings.colorSecondary}
                onChange={e => handleChange('colorSecondary', e.target.value)}
                className="w-10 h-10 border-0 p-0 rounded-lg cursor-pointer"
              />
              <input 
                type="text" 
                value={settings.colorSecondary}
                onChange={e => handleChange('colorSecondary', e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg uppercase"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <List size={20} className="text-slate-500" />
            <h3 className="text-lg font-bold text-slate-800">SKUs dos Produtos</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6">Mapeie os produtos lógicos da calculadora para os SKUs reais da sua loja. Deixe em branco se o produto não estiver no catálogo (ele será exibido no orçamento sem link e sem botão de comprar).</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allProducts.map(product => (
               <div key={product.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <label className="block text-xs font-bold text-slate-700 mb-1">{product.name}</label>
                 <div className="text-[10px] text-slate-400 mb-2">ID Interno: {product.id}</div>
                 <input 
                   type="text" 
                   value={settings.productSkus[product.id] !== undefined ? settings.productSkus[product.id] : product.sku}
                   onChange={e => handleProductSkuChange(product.id, e.target.value)}
                   className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#DF1319]"
                   placeholder={`Ex: ${product.sku}`}
                 />
               </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
        {saved && <span className="text-green-600 flex items-center gap-1 text-sm font-semibold"><CheckCircle2 size={16} /> Salvo com sucesso!</span>}
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
        >
          <Save size={18} />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
