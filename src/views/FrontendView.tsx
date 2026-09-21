import React, { useState, useEffect, useRef } from 'react';
import { ProjectInputs, NoiseLevel, AcousticIsolation, UsageType } from '../types';
import { INITIAL_SIZING_CONFIG } from '../data/sizingConfig';
import { calculateSizing } from '../utils/sizingEngine';
import { Diagram } from '../components/Diagram';
import { Settings, Send, AlertCircle, Mail, ChevronRight, ChevronLeft, CheckCircle2, ExternalLink, Package } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function FrontendView() {
  const [step, setStep] = useState(1);
  const [wooProducts, setWooProducts] = useState<Record<string, any>>({});
  const [colors, setColors] = useState({ primary: '#df1319', secondary: '#9ebf24' });
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const [customConfig, setCustomConfig] = useState(INITIAL_SIZING_CONFIG);

  useEffect(() => {
     const wpSettings = (window as any).workproCalcSettings;
     if (wpSettings && wpSettings.productSkus) {
        const productSkus = wpSettings.productSkus;
        const newConfig = { ...INITIAL_SIZING_CONFIG };
        newConfig.speakerCatalog = newConfig.speakerCatalog.map(p => ({ ...p, sku: productSkus[p.id] !== undefined ? productSkus[p.id] : p.sku }));
        newConfig.amplifierCatalog = newConfig.amplifierCatalog.map(p => ({ ...p, sku: productSkus[p.id] !== undefined ? productSkus[p.id] : p.sku }));
        newConfig.accessoryCatalog = newConfig.accessoryCatalog.map(p => ({ ...p, sku: productSkus[p.id] !== undefined ? productSkus[p.id] : p.sku }));
        setCustomConfig(newConfig);
     }
     
     if (wpSettings && wpSettings.wooProducts) {
        setWooProducts(wpSettings.wooProducts);
     }
     
     if (wpSettings) {
        setColors({
           primary: wpSettings.colorPrimary || '#df1319',
           secondary: wpSettings.colorSecondary || '#9ebf24'
        });
     } else {
        const storedColors = localStorage.getItem('workproCalcColors');
        if (storedColors) {
            try {
                setColors(JSON.parse(storedColors));
            } catch (e) {}
        }
     }
  }, []);

  const [inputs, setInputs] = useState<ProjectInputs>({
    projectType: 'single_room',
    userEmail: '',
    widthMeters: 10,
    lengthMeters: 5,
    ceilingHeightMeters: 3,
    noiseLevel: 'low',
    acousticIsolation: 'average',
    usageType: 'bgm',
    environmentType: 'office',
    mountingPreference: 'ceiling',
    coverageDensity: 'minimum_overlap',
    pagingMicCount: 1,
    bgmSourcesCount: 1,
    zoneCount: 4,
    maxCableDistance: 50,
    cableCalcDistance: 30,
    cableCalcPower: 100,
    cableCalcImpedance: 'high'
  });

  const [isQuoteSent, setIsQuoteSent] = useState(false);

  const handleInputChange = (field: keyof ProjectInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const resultStep = inputs.projectType === 'cable_calc' ? 3 : (inputs.projectType === 'multi_zone' ? 3 : 4);
  const calcStep = inputs.projectType === 'cable_calc' ? 2 : (inputs.projectType === 'multi_zone' ? 2 : 3);

  const handleNext = () => setStep(s => Math.min(s + 1, resultStep));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));
  
  const getSelectionStyle = (isSelected: boolean) => {
    return isSelected 
      ? { borderColor: colors.primary, backgroundColor: '#f8fafc', color: colors.primary } 
      : { borderColor: '#e2e8f0', backgroundColor: '#ffffff', color: '#475569' };
  };
  
  const getStepCircleStyle = (isPassed: boolean) => {
    return isPassed 
      ? { backgroundColor: colors.primary, color: '#ffffff' } 
      : { backgroundColor: '#e2e8f0', color: '#64748b' };
  };

  const getStepLineStyle = (isPassed: boolean) => {
    return isPassed 
      ? { backgroundColor: colors.primary } 
      : { backgroundColor: '#e2e8f0' };
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    
    // Simulate WP REST API Call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (!(window as any).workproCalcSettings) {
      // Calculate BoM first to get SKUs
      const sizingResult = calculateSizing(inputs, customConfig);
      
      const mockWcResponse: Record<string, any> = {};
      sizingResult.bom.forEach(item => {
        if (!item.sku || item.sku.trim() === '') {
           mockWcResponse[item.id] = null; // Representa não encontrado
        } else {
           mockWcResponse[item.id] = {
             id: Math.floor(Math.random() * 10000), // Simula ID do WP
             name: `Produto (${item.sku})`,
             url: `https://discabos.com.br/produto/${item.sku.toLowerCase()}`,
             image: `https://via.placeholder.com/80?text=${item.sku}`
           };
        }
      });
      setWooProducts(mockWcResponse);
    }
    
    setIsCalculating(false);
    setStep(resultStep);
  };

  const sizing = step === resultStep ? calculateSizing(inputs, customConfig) : null;

  const handleSendQuote = async () => {
    setIsSending(true);
    let imageBase64 = '';
    if (resultRef.current) {
       try {
           const canvas = await html2canvas(resultRef.current, { scale: 1.5 });
           imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
       } catch (e) {
           console.error('Failed to capture canvas', e);
       }
    }

    const wpSettings = (window as any).workproCalcSettings;
    if (wpSettings && wpSettings.ajaxUrl) {
       try {
           const htmlContent = `
              <h2 style="color: #333;">Dimensionamento: ${sizing?.architectureName}</h2>
              <p style="color: #555;">${sizing?.architectureDescription}</p>
              <h3 style="color: #444; border-bottom: 1px solid #ccc; padding-bottom: 4px;">Lista de Materiais (BoM)</h3>
              <ul>
                 ${sizing?.bom.map(i => `<li style="margin-bottom: 8px;"><b>${i.quantity}x ${i.name}</b> <br/><small style="color: #888;">SKU: ${i.sku || 'N/A'}</small></li>`).join('')}
              </ul>
           `;

           await fetch(wpSettings.ajaxUrl + 'send-email', {
             method: 'POST',
             headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
             },
             body: JSON.stringify({
                userEmail: inputs.userEmail,
                htmlContent,
                imageBase64
             })
          });
       } catch (e) {
          console.error(e);
       }
    } else {
       // Simulate local
       await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setIsSending(false);
    setIsQuoteSent(true);
  };

  return (
    <div className="w-full p-2 md:p-4 font-[inherit] workpro-calc-container">
      <style>{`
        .workpro-calc-container {
          --wp-primary: ${colors.primary};
          --wp-secondary: ${colors.secondary};
        }
        .workpro-calc-container input:focus, .workpro-calc-container select:focus {
          outline: none;
          border-color: var(--wp-primary) !important;
          box-shadow: 0 0 0 2px var(--wp-primary) !important;
        }
        .wp-title-primary {
          color: var(--wp-primary) !important;
        }
      `}</style>
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        
        {/* Wizard Header / Progress */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 md:p-6">
          <div className="flex items-center gap-2">
            {Array.from({ length: resultStep }, (_, i) => i + 1).map(num => (
              <React.Fragment key={num}>
                <div 
                  className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors"
                  style={getStepCircleStyle(step >= num)}
                >
                  {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
                </div>
                {num < resultStep && (
                  <div 
                    className="flex-1 h-1.5 rounded-full transition-colors" 
                    style={getStepLineStyle(step > num)} 
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs font-semibold text-slate-500 px-1">
            <span>Tipo</span>
            <span>{inputs.projectType === 'single_room' ? 'Dimensões' : (inputs.projectType === 'multi_zone' ? 'Distribuição' : 'Parâmetros')}</span>
            {inputs.projectType === 'single_room' && <span>Ambiente</span>}
            <span>Resultado</span>
          </div>
        </div>

        {/* Wizard Content Body */}
        <div className="p-6 md:p-8 min-h-[350px]">
          
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold wp-title-primary mb-2">Qual o escopo do projeto?</h3>
              <p className="text-slate-600 mb-8">Selecione se deseja sonorizar um ambiente único ou um sistema com múltiplos setores.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <button
                  onClick={() => handleInputChange('projectType', 'single_room')}
                  className="p-6 border-2 rounded-xl text-left transition-all"
                  style={getSelectionStyle(inputs.projectType === 'single_room')}
                >
                  <div className="font-bold text-lg  mb-2">Ambiente Único</div>
                  <div className="text-sm text-slate-600">Dimensiona alto-falantes e amplificador para uma sala específica com base na acústica e medidas.</div>
                </button>
                <button
                  onClick={() => handleInputChange('projectType', 'multi_zone')}
                  className="p-6 border-2 rounded-xl text-left transition-all"
                  style={getSelectionStyle(inputs.projectType === 'multi_zone')}
                >
                  <div className="font-bold text-lg  mb-2">Distribuição de Sinal (Setores)</div>
                  <div className="text-sm text-slate-600">Calcula se o roteamento do áudio entre vários ambientes deve usar Matriz Analógica ou Áudio sobre IP.</div>
                </button>
                <button
                  onClick={() => handleInputChange('projectType', 'cable_calc')}
                  className="p-6 border-2 rounded-xl text-left transition-all"
                  style={getSelectionStyle(inputs.projectType === 'cable_calc')}
                >
                  <div className="font-bold text-lg  mb-2">Calculadora de Cabeamento</div>
                  <div className="text-sm text-slate-600">Calcula a bitola ideal do cabo paralelo com base na distância e potência, para sistemas de alta ou baixa impedância.</div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && inputs.projectType === 'single_room' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold wp-title-primary mb-2">Qual o tamanho do ambiente?</h3>
              <p className="text-slate-600 mb-8">Defina as medidas do local a ser sonorizado (em metros) e o tipo de fixação desejada.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <label className="block text-lg font-bold text-slate-700 mb-2">Largura (m)</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={inputs.widthMeters} 
                    onChange={e => handleInputChange('widthMeters', (e.target.value === '' ? '' : parseFloat(e.target.value)) as any)}
                    className="w-full px-4 py-3 text-xl font-bold border border-slate-300 rounded-md  text-center"
                  />
                </div>
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <label className="block text-lg font-bold text-slate-700 mb-2">Comprimento (m)</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={inputs.lengthMeters} 
                    onChange={e => handleInputChange('lengthMeters', (e.target.value === '' ? '' : parseFloat(e.target.value)) as any)}
                    className="w-full px-4 py-3 text-xl font-bold border border-slate-300 rounded-md  text-center"
                  />
                </div>
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <label className="block text-lg font-bold text-slate-700 mb-2">Pé Direito (m)</label>
                  <input 
                    type="number" 
                    min={2} 
                    step={0.1}
                    value={inputs.ceilingHeightMeters} 
                    onChange={e => handleInputChange('ceilingHeightMeters', (e.target.value === '' ? '' : parseFloat(e.target.value)) as any)}
                    className="w-full px-4 py-3 text-xl font-bold border border-slate-300 rounded-md  text-center"
                  />
                </div>
              </div>

              <div className="mt-8">
                 <h3 className="text-xl font-bold wp-title-primary mb-4">Fixação dos Alto-falantes</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleInputChange('mountingPreference', 'ceiling')}
                      className="p-4 border-2 rounded-lg text-center font-bold transition-all text-slate-700 hover:border-slate-300"
                      style={getSelectionStyle(inputs.mountingPreference === 'ceiling')}
                    >
                      Teto (Embutir)
                    </button>
                    <button 
                      onClick={() => handleInputChange('mountingPreference', 'wall')}
                      className="p-4 border-2 rounded-lg text-center font-bold transition-all text-slate-700 hover:border-slate-300"
                      style={getSelectionStyle(inputs.mountingPreference === 'wall')}
                    >
                      Parede (Sobrepor)
                    </button>
                 </div>
              </div>
            </div>
          )}

          {step === 2 && inputs.projectType === 'multi_zone' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold wp-title-primary mb-2">Estrutura de Distribuição</h3>
              <p className="text-slate-600 mb-8">Defina a quantidade de ambientes, fontes de sinal e distâncias para calcular o roteamento (Matriz vs. IP).</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <label className="block text-lg font-bold text-slate-700 mb-2">Quantidade de Ambientes</label>
                  <p className="text-sm text-slate-500 mb-4">Quantos setores ou zonas independentes receberão áudio?</p>
                  <input 
                    type="number" 
                    min={1}
                    value={inputs.zoneCount} 
                    onChange={e => handleInputChange('zoneCount', (e.target.value === '' ? '' : parseInt(e.target.value)) as any)}
                    className="w-full px-4 py-3 text-xl font-bold border border-slate-300 rounded-md "
                  />
                </div>

                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <label className="block text-lg font-bold text-slate-700 mb-2">Distância Máxima (metros)</label>
                  <p className="text-sm text-slate-500 mb-4">Qual a distância da central até o ambiente mais distante?</p>
                  <input 
                    type="number" 
                    min={1}
                    step={10}
                    value={inputs.maxCableDistance} 
                    onChange={e => handleInputChange('maxCableDistance', (e.target.value === '' ? '' : parseInt(e.target.value)) as any)}
                    className="w-full px-4 py-3 text-xl font-bold border border-slate-300 rounded-md "
                  />
                </div>

                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <label className="block text-lg font-bold text-slate-700 mb-2">Microfones de Avisos</label>
                  <p className="text-sm text-slate-500 mb-4">Quantas bases de microfone independentes o sistema terá?</p>
                  <input 
                    type="number" 
                    min={0}
                    value={inputs.pagingMicCount} 
                    onChange={e => handleInputChange('pagingMicCount', (e.target.value === '' ? '' : parseInt(e.target.value)) as any)}
                    className="w-full px-4 py-3 text-xl font-bold border border-slate-300 rounded-md "
                  />
                </div>

                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <label className="block text-lg font-bold text-slate-700 mb-2">Fontes de Música/Mensagens</label>
                  <p className="text-sm text-slate-500 mb-4">Quantos players ou fontes de áudio gravado serão usados?</p>
                  <input 
                    type="number" 
                    min={0}
                    value={inputs.bgmSourcesCount} 
                    onChange={e => handleInputChange('bgmSourcesCount', (e.target.value === '' ? '' : parseInt(e.target.value)) as any)}
                    className="w-full px-4 py-3 text-xl font-bold border border-slate-300 rounded-md "
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && inputs.projectType === 'cable_calc' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold wp-title-primary mb-2">Parâmetros do Cabeamento</h3>
              <p className="text-slate-600 mb-8">Informe a distância, potência total e o tipo de impedância para descobrir a bitola ideal do cabo.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <label className="block text-lg font-bold text-slate-700 mb-2">Distância do Cabo (m)</label>
                  <p className="text-sm text-slate-500 mb-4">Comprimento do cabo do amplificador até a última caixa.</p>
                  <input 
                    type="number" 
                    min={1} 
                    value={inputs.cableCalcDistance} 
                    onChange={e => handleInputChange('cableCalcDistance', (e.target.value === '' ? '' : parseFloat(e.target.value)) as any)}
                    className="w-full px-4 py-3 text-xl font-bold border border-slate-300 rounded-md  text-center"
                  />
                </div>
                
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <label className="block text-lg font-bold text-slate-700 mb-2">Potência Total (W)</label>
                  <p className="text-sm text-slate-500 mb-4">Soma das potências de todas as caixas ligadas nesta linha.</p>
                  <input 
                    type="number" 
                    min={1} 
                    value={inputs.cableCalcPower} 
                    onChange={e => handleInputChange('cableCalcPower', (e.target.value === '' ? '' : parseFloat(e.target.value)) as any)}
                    className="w-full px-4 py-3 text-xl font-bold border border-slate-300 rounded-md  text-center"
                  />
                </div>
              </div>

              <div className="mt-8 max-w-4xl mx-auto">
                 <h3 className="text-xl font-bold wp-title-primary mb-4">Tipo de Sistema</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleInputChange('cableCalcImpedance', 'high')}
                      className="p-4 border-2 rounded-lg text-center font-bold transition-all text-slate-700 hover:border-slate-300"
                      style={getSelectionStyle(inputs.cableCalcImpedance === 'high')}
                    >
                      Alta Impedância (Linha 70V / 100V)
                    </button>
                    <button 
                      onClick={() => handleInputChange('cableCalcImpedance', 'low')}
                      className="p-4 border-2 rounded-lg text-center font-bold transition-all text-slate-700 hover:border-slate-300"
                      style={getSelectionStyle(inputs.cableCalcImpedance === 'low')}
                    >
                      Baixa Impedância (4Ω / 8Ω)
                    </button>
                 </div>
              </div>
            </div>
          )}

          {step === 3 && inputs.projectType === 'single_room' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-bold wp-title-primary mb-2">Como é a acústica do local?</h3>
              <p className="text-slate-600 mb-8">O nível de ruído e as características do ambiente definem a potência necessária.</p>
              
              <div className="max-w-lg mx-auto space-y-6">
                <div>
                  <label className="block text-lg font-bold text-slate-700 mb-2">Tipo de Ambiente</label>
                  <select 
                    value={inputs.environmentType} 
                    onChange={e => handleInputChange('environmentType', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
                  >
                    <option value="office">Escritório / Sala de Reunião</option>
                    <option value="restaurant">Restaurante / Bar</option>
                    <option value="warehouse">Galpão / Fábrica</option>
                    <option value="outdoor">Área Externa</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-lg font-bold text-slate-700 mb-2">Nível de Ruído Frequente</label>
                  <select 
                    value={inputs.noiseLevel} 
                    onChange={e => handleInputChange('noiseLevel', e.target.value as NoiseLevel)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
                  >
                    <option value="low">Baixo (Silencioso)</option>
                    <option value="medium">Médio (Conversas normais)</option>
                    <option value="high">Alto (Máquinas, Multidão)</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-8 border-t border-slate-200 pt-8">
                <label className="block text-lg font-bold text-slate-700 mb-4">Nível de Cobertura Desejado</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Borda-a-Borda */}
                  <div 
                    onClick={() => handleInputChange('coverageDensity', 'edge_to_edge')}
                    className="cursor-pointer border-2 rounded-xl p-4 transition-all"
                    style={getSelectionStyle(inputs.coverageDensity === 'edge_to_edge')}
                  >
                    <div className="h-24 w-full flex items-center justify-center gap-1 mb-3 opacity-80">
                       <div className="w-12 h-12 rounded-full border-2 border-blue-500 bg-blue-100 flex items-center justify-center relative">
                         <div className="w-1 h-1 bg-blue-800 rounded-full"></div>
                       </div>
                       <div className="w-12 h-12 rounded-full border-2 border-blue-500 bg-blue-100 flex items-center justify-center relative">
                         <div className="w-1 h-1 bg-blue-800 rounded-full"></div>
                       </div>
                    </div>
                    <h4 className="font-bold  text-center mb-1">Borda a Borda</h4>
                    <p className="text-xs text-slate-500 text-center">Menos caixas, cobertura básica. O limite de som de uma encosta na outra.</p>
                  </div>

                  {/* Sobreposição Mínima */}
                  <div 
                    onClick={() => handleInputChange('coverageDensity', 'minimum_overlap')}
                    className="cursor-pointer border-2 rounded-xl p-4 transition-all"
                    style={getSelectionStyle(inputs.coverageDensity === 'minimum_overlap')}
                  >
                    <div className="h-24 w-full flex items-center justify-center mb-3 opacity-80">
                       <div className="w-12 h-12 rounded-full border-2 border-green-500 bg-green-100 flex items-center justify-center relative translate-x-3 z-10 mix-blend-multiply">
                         <div className="w-1 h-1 bg-green-800 rounded-full"></div>
                       </div>
                       <div className="w-12 h-12 rounded-full border-2 border-green-500 bg-green-100 flex items-center justify-center relative -translate-x-3 z-0 mix-blend-multiply">
                         <div className="w-1 h-1 bg-green-800 rounded-full"></div>
                       </div>
                    </div>
                    <h4 className="font-bold  text-center mb-1">Sobreposição Mínima</h4>
                    <p className="text-xs text-slate-500 text-center">Recomendado. Os cones se cruzam levemente para evitar pontos cegos e variação de SPL.</p>
                  </div>

                  {/* Centro a Centro */}
                  <div 
                    onClick={() => handleInputChange('coverageDensity', 'center_to_center')}
                    className="cursor-pointer border-2 rounded-xl p-4 transition-all"
                    style={getSelectionStyle(inputs.coverageDensity === 'center_to_center')}
                  >
                    <div className="h-24 w-full flex items-center justify-center mb-3 opacity-80">
                       <div className="w-16 h-16 rounded-full border-2 border-amber-500 bg-amber-100 flex items-center justify-center relative translate-x-4 z-10 mix-blend-multiply">
                         <div className="w-1 h-1 bg-amber-800 rounded-full"></div>
                       </div>
                       <div className="w-16 h-16 rounded-full border-2 border-amber-500 bg-amber-100 flex items-center justify-center relative -translate-x-4 z-0 mix-blend-multiply">
                         <div className="w-1 h-1 bg-amber-800 rounded-full"></div>
                       </div>
                    </div>
                    <h4 className="font-bold  text-center mb-1">Centro a Centro</h4>
                    <p className="text-xs text-slate-500 text-center">Alta densidade. A borda de uma caixa atinge o centro da outra. Máxima uniformidade.</p>
                  </div>

                </div>
              </div>
            </div>
          )}

          {step === resultStep && sizing && (
            <div className="animate-in fade-in zoom-in-95 duration-500" ref={resultRef}>
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold wp-title-primary">Solução Recomendada</h2>
                    <span className="px-4 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-bold border border-blue-200 shadow-sm">
                      {sizing.architectureName}
                    </span>
                  </div>

                  {/* Resumo do Projeto */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                     {inputs.projectType === 'single_room' && (
                        <>
                          <div><span className="text-slate-500">Área:</span> <span className="font-semibold">{inputs.widthMeters}m x {inputs.lengthMeters}m ({inputs.widthMeters * inputs.lengthMeters}m²)</span></div>
                          <div><span className="text-slate-500">Pé Direito:</span> <span className="font-semibold">{inputs.ceilingHeightMeters}m</span></div>
                          <div><span className="text-slate-500">Ambiente:</span> <span className="font-semibold">{inputs.environmentType === 'office' ? 'Escritório/Sala' : inputs.environmentType === 'restaurant' ? 'Restaurante/Bar' : inputs.environmentType === 'warehouse' ? 'Galpão/Fábrica' : 'Externo'}</span></div>
                          <div><span className="text-slate-500">Nível de Ruído:</span> <span className="font-semibold">{inputs.noiseLevel === 'low' ? 'Baixo' : inputs.noiseLevel === 'medium' ? 'Médio' : 'Alto'}</span></div>
                          <div><span className="text-slate-500">Fixação:</span> <span className="font-semibold">{inputs.mountingPreference === 'ceiling' ? 'Teto' : 'Parede'}</span></div>
                          <div><span className="text-slate-500">Cobertura:</span> <span className="font-semibold">{inputs.coverageDensity === 'edge_to_edge' ? 'Borda a Borda' : inputs.coverageDensity === 'center_to_center' ? 'Centro a Centro' : 'Sobreposição Mínima'}</span></div>
                        </>
                     )}
                     {inputs.projectType === 'multi_zone' && (
                        <>
                          <div><span className="text-slate-500">Zonas:</span> <span className="font-semibold">{inputs.zoneCount}</span></div>
                          <div><span className="text-slate-500">Fontes Musicais:</span> <span className="font-semibold">{inputs.bgmSourcesCount}</span></div>
                          <div><span className="text-slate-500">Microfones de Chamada:</span> <span className="font-semibold">{inputs.pagingMicCount}</span></div>
                        </>
                     )}
                     {inputs.projectType === 'cable_calc' && (
                        <>
                          <div><span className="text-slate-500">Distância:</span> <span className="font-semibold">{inputs.cableCalcDistance}m</span></div>
                          <div><span className="text-slate-500">Potência Total:</span> <span className="font-semibold">{inputs.cableCalcPower}W</span></div>
                          <div><span className="text-slate-500">Impedância:</span> <span className="font-semibold">{inputs.cableCalcImpedance === 'low' ? 'Baixa (4/8 ohms)' : 'Alta (70/100V)'}</span></div>
                        </>
                     )}
                  </div>

                  <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 mb-8 shadow-sm">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center shrink-0 font-bold">1</div>
                      <div>
                        <h4 className="font-bold text-blue-900 mb-1 text-lg">Resumo do Sistema</h4>
                        <p className="text-blue-800 leading-relaxed">{sizing.architectureDescription}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center shrink-0 font-bold">2</div>
                      <div>
                        <h4 className="font-bold text-blue-900 mb-1 text-lg">Justificativa Técnica</h4>
                        <p className="text-blue-800 leading-relaxed">{sizing.architectureReasoning}</p>
                      </div>
                    </div>
                    {sizing.calculationExplanation && (
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center shrink-0 font-bold">3</div>
                        <div>
                          <h4 className="font-bold text-blue-900 mb-1 text-lg">Lógica de Dimensionamento</h4>
                          <pre className="text-blue-800 leading-relaxed whitespace-pre-wrap font-sans text-sm bg-white bg-opacity-50 p-4 rounded mt-2 border border-blue-200">{sizing.calculationExplanation}</pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {(inputs.projectType === 'single_room' || inputs.projectType === 'multi_zone') && (
                    <div className="mb-8">
                      <Diagram sizing={sizing} inputs={inputs} />
                    </div>
                  )}

                  {sizing.bestPractices.length > 0 && (
                     <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                           <AlertCircle className="w-5 h-5" />
                           Boas Práticas de Instalação
                        </h4>
                        <ul className="list-disc pl-5 text-sm text-amber-700 space-y-1">
                           {sizing.bestPractices.map((bp, i) => <li key={i}>{bp}</li>)}
                        </ul>
                     </div>
                  )}

                  <div className="mb-8">
                    <h3 className="text-lg font-bold wp-title-primary mb-4 border-b pb-2">Lista de Materiais (BoM)</h3>
                    <div className="overflow-x-auto rounded border border-slate-200 shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xs tracking-wider">
                          <tr>
                            <th className="p-4 uppercase w-20 text-center">FOTO</th>
                            <th className="p-4 uppercase">PRODUTO</th>
                            <th className="p-4 uppercase text-center w-24">SKU</th>
                            <th className="p-4 uppercase text-center w-32">CATEGORIA</th>
                            <th className="p-4 uppercase text-center w-20">QTD</th>
                            <th className="p-4 uppercase text-center w-36">AÇÕES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sizing.bom.map((item, idx) => {
                            const wcProduct = wooProducts[item.id];
                            const isNotFound = !item.sku || wcProduct === null;
                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-center">
                                    {!isNotFound && wcProduct ? (
                                      wcProduct.image ? (
                                        <img src={wcProduct.image} alt={item.name} className="w-12 h-12 object-contain mx-auto shrink-0 mix-blend-multiply" />
                                      ) : (
                                        <div className="w-12 h-12 bg-slate-100 rounded border border-slate-200 shrink-0 mx-auto flex items-center justify-center text-slate-400">
                                          <Package className="w-5 h-5" />
                                        </div>
                                      )
                                    ) : (
                                      <div className="w-12 h-12 bg-slate-100 rounded border border-slate-200 shrink-0 mx-auto flex items-center justify-center text-slate-400">
                                        <Package className="w-5 h-5" />
                                      </div>
                                    )}
                                </td>
                                <td className="p-4">
                                  <div className="font-bold  text-base">{wcProduct ? wcProduct.name : item.name}</div>
                                  {isNotFound && (
                                      <div className="text-xs text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 inline-block mt-1">não encontrado no catálogo</div>
                                  )}
                                  {item.notes && <div className="text-[12px] text-slate-400 mt-1 italic">{item.notes}</div>}
                                </td>
                                <td className="p-4 text-center">
                                    {!isNotFound ? (
                                        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-500 font-mono">
                                            {item.sku}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                  <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-600 font-semibold uppercase">
                                    {item.category}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="font-bold  text-lg">
                                    {item.quantity}
                                  </div>
                                </td>
                                <td className="p-4">
                                    {!isNotFound && wcProduct && (
                                        <div className="flex flex-col gap-2">
                                          <a href={`/?add-to-cart=${wcProduct.id}&quantity=${item.quantity}`} className="w-full justify-center inline-flex items-center text-xs font-bold text-white px-3 py-1.5 rounded transition-opacity hover:opacity-90" style={{ backgroundColor: colors.secondary }}>
                                            ADICIONAR
                                          </a>
                                          <a href={wcProduct.url} target="_blank" rel="noreferrer" className="w-full justify-center inline-flex items-center text-xs font-bold bg-white border px-3 py-1.5 rounded transition-colors hover:opacity-80" style={{ color: colors.secondary, borderColor: colors.secondary }}>
                                            Ver Produto
                                          </a>
                                        </div>
                                    )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-200">
                    {!isQuoteSent ? (
                      <div className="flex flex-col sm:flex-row items-center gap-6 justify-between p-6 rounded-xl border" style={{ backgroundColor: `${colors.secondary}15`, borderColor: `${colors.secondary}30` }}>
                        <div style={{ color: colors.secondary }} className="brightness-75">
                          <span className="font-bold text-lg block mb-1">Gostou desta solução?</span>
                          <span className="text-sm opacity-90">Envie o relatório completo para o seu e-mail corporativo.</span>
                        </div>
                        <button 
                          onClick={handleSendQuote}
                          disabled={isSending}
                          className="w-full sm:w-auto px-8 py-4 text-white font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-3 shadow-md shrink-0 text-lg"
                          style={{ backgroundColor: colors.secondary }}
                        >
                          <Send className="w-5 h-5" />
                          {isSending ? 'Enviando...' : 'Enviar por E-mail'}
                        </button>
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border text-center animate-in fade-in zoom-in-95" style={{ backgroundColor: `${colors.secondary}15`, borderColor: `${colors.secondary}30` }}>
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: colors.secondary }} />
                        <div className="font-bold text-xl mb-2 brightness-75" style={{ color: colors.secondary }}>E-mail enviado com sucesso!</div>
                        <div className="brightness-75" style={{ color: colors.secondary }}>Verifique sua caixa de entrada para visualizar o relatório completo.</div>
                      </div>
                    )}
                  </div>
                </div>
            </div>
          )}

        </div>

        {/* Wizard Footer Controls */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
          {step > 1 && step < resultStep ? (
            <button onClick={handlePrev} className="px-6 py-2.5 text-slate-600 bg-slate-100 font-bold hover:bg-slate-200 rounded-lg transition flex items-center gap-2 border-0">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          ) : <div></div>}

          {step < calcStep ? (
            <button onClick={handleNext} className="px-6 py-2.5 text-white font-bold rounded-lg transition-opacity hover:opacity-90 shadow-md flex items-center gap-2" style={{ backgroundColor: colors.primary }}>
              Avançar <ChevronRight className="w-4 h-4" />
            </button>
          ) : step === calcStep ? (
            <button onClick={handleCalculate} disabled={isCalculating} className="px-8 py-3 text-white font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-70 shadow-md flex items-center gap-2 text-lg" style={{ backgroundColor: colors.primary }}>
              {isCalculating ? 'Calculando...' : 'Sugerir Sonorização'} {!isCalculating && <ChevronRight className="w-5 h-5" />}
            </button>
          ) : step === resultStep ? (
             <button onClick={() => { setStep(1); setIsQuoteSent(false); }} className="px-6 py-2.5 text-white font-bold rounded-lg transition-opacity hover:opacity-90 flex items-center gap-2 shadow-md" style={{ backgroundColor: colors.secondary }}>
              Fazer Novo Dimensionamento
            </button>
          ) : null}
        </div>

      </div>
    </div>
  );
}
