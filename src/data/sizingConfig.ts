import { ConfigurableRules } from '../types';

export const INITIAL_SIZING_CONFIG: ConfigurableRules = {
  version: "1.1",
  lastUpdated: "2023-11-20",
  adminEmail: "comercial@discabos.com.br",
  speakerCatalog: [
    {
      id: "spk_ceiling_amt5",
      name: "Arandela de Teto AMT 5",
      sku: "WORKPRO-AMT-5",
      brand: "Workpro",
      mountType: "ceiling",
      powerW: 10,
      sensitivityDb: 89, // 1W/1m
      dispersionAngle: 140, // Ampliou para 140 para AMT 5 (geralmente mais aberto)
      bestFor: ["office", "restaurant", "bgm"],
      pros: ["Design minimalista", "Ampla dispersão para música ambiente"]
    },
    {
      id: "spk_ceiling_ic611",
      name: "Arandela de Teto IC 611",
      sku: "WORKPRO-IC-611",
      brand: "Workpro",
      mountType: "ceiling",
      powerW: 20,
      sensitivityDb: 90, // 1W/1m
      dispersionAngle: 100, // 100 degrees conical
      bestFor: ["office", "restaurant", "bgm", "paging"],
      pros: ["Maior potência", "Boa resposta de frequência"]
    },
    {
      id: "spk_ceiling_ic5kpro",
      name: "Arandela de Teto IC 5K PRO",
      sku: "WORKPRO-IC-5K-PRO",
      brand: "Workpro",
      mountType: "ceiling",
      powerW: 30,
      sensitivityDb: 91,
      dispersionAngle: 90,
      bestFor: ["high_ceiling", "premium_bgm"],
      pros: ["Alta fidelidade", "Ideal para pé direito alto"]
    },
    {
      id: "spk_wall_neo3",
      name: "Caixa de Parede NEO 3",
      sku: "WORKPRO-NEO-3",
      brand: "Workpro",
      mountType: "wall",
      powerW: 6,
      sensitivityDb: 87, // 1W/1m
      dispersionAngle: 90, // Menor ângulo para não superestimar área de parede
      bestFor: ["office", "restaurant", "bgm"],
      pros: ["Ultracompacta", "Fácil instalação"]
    },
    {
      id: "spk_wall_neo5ip",
      name: "Caixa de Parede NEO 5 IP",
      sku: "WORKPRO-NEO-5-IP",
      brand: "Workpro",
      mountType: "wall",
      powerW: 20, // Internal amp for IP
      sensitivityDb: 89,
      dispersionAngle: 90, // HxV 90x80
      bestFor: ["outdoor", "warehouse", "audio_over_ip"],
      pros: ["Conexão direta na rede IP", "Zonamento individual"]
    },
    {
      id: "spk_horn_sc615m",
      name: "Corneta SC-615M",
      sku: "TOA-SC-615M",
      brand: "TOA",
      mountType: "horn",
      powerW: 15,
      sensitivityDb: 112,
      dispersionAngle: 60,
      bestFor: ["warehouse", "outdoor", "paging"],
      pros: ["Alta inteligibilidade para voz", "Resistente a intempéries"]
    },
    {
      id: "spk_horn_sc630m",
      name: "Corneta SC-630M",
      sku: "TOA-SC-630M",
      brand: "TOA",
      mountType: "horn",
      powerW: 30,
      sensitivityDb: 113,
      dispersionAngle: 60,
      bestFor: ["warehouse", "outdoor", "paging", "voice_evac"],
      pros: ["Pressão sonora extrema", "Longo alcance"]
    }
  ],
  amplifierCatalog: [
    {
      id: "amp_aml65",
      name: "Amplificador AML 65 (70V)",
      sku: "WORKPRO-AML-65",
      brand: "Workpro",
      channels: 1,
      powerPerChannelW: 65,
      is70V: true,
      hasIP: false,
      pros: ["Ideal para pequenos espaços", "Entradas de mic"]
    },
    {
      id: "amp_aml120",
      name: "Amplificador AML 120 (70V)",
      sku: "WORKPRO-AML-120",
      brand: "Workpro",
      channels: 1,
      powerPerChannelW: 120,
      is70V: true,
      hasIP: false,
      pros: ["Custo benefício", "Fácil instalação"]
    },
    {
      id: "amp_pm2404",
      name: "Amplificador PM 2404 (4 Canais)",
      sku: "WORKPRO-PM-2404",
      brand: "Workpro",
      channels: 4,
      powerPerChannelW: 240, // Usually 240W per channel or total
      is70V: true,
      hasIP: false,
      pros: ["4 zonas independentes", "Alta potência"]
    },
    {
      id: "amp_pa4500",
      name: "Amplificador PA 4500",
      sku: "WORKPRO-PA-4500",
      brand: "Workpro",
      channels: 4,
      powerPerChannelW: 500,
      is70V: true,
      hasIP: false,
      pros: ["Potência industrial", "Múltiplas zonas de grande porte"]
    }
  ],
  accessoryCatalog: [
    {
      id: "acc_wpe44",
      name: "Matriz DSP WPE 44",
      sku: "WORKPRO-WPE-44",
      category: "dsp_matrix",
      description: "Processador DSP 4x4 para roteamento de zonas"
    },
    {
      id: "acc_integra8s",
      name: "Matriz DSP Integra 8s",
      sku: "WORKPRO-INTEGRA-8S",
      category: "dsp_matrix",
      description: "Processador Digital avançado para múltiplas zonas"
    },
    {
      id: "acc_sps8",
      name: "Estação de Chamada IP SPS 8",
      sku: "WORKPRO-SPS-8",
      category: "paging_station",
      description: "Console de paging IP programável (BlueLine)"
    },
    {
      id: "acc_dm115",
      name: "Microfone Dinâmico DM 115",
      sku: "WORKPRO-DM-115",
      category: "microphone",
      description: "Microfone para avisos"
    },
    {
      id: "acc_dm1n",
      name: "Microfone DM 1 N",
      sku: "WORKPRO-DM-1-N",
      category: "microphone",
      description: "Microfone de mesa para anúncios (Analógico)"
    },
    {
      id: "acc_bls2",
      name: "Emissor BlueLine BLS 2",
      sku: "WORKPRO-BLS-2",
      category: "audio_over_ip_tx",
      description: "Transmissor IP 2 canais"
    },
    {
      id: "acc_blssd",
      name: "Emissor BlueLine BLS SD",
      sku: "WORKPRO-BLS-SD",
      category: "audio_over_ip_tx",
      description: "Transmissor IP com reprodutor SD integrado"
    },
    {
      id: "acc_blr2",
      name: "Receptor BlueLine BLR 2",
      sku: "WORKPRO-BLR-2",
      category: "audio_over_ip_rx",
      description: "Receptor IP 2 canais analógico"
    },
    {
      id: "acc_blraplus",
      name: "Receptor BlueLine BLR A Plus",
      sku: "WORKPRO-BLR-A-PLUS",
      category: "audio_over_ip_rx",
      description: "Receptor IP com amplificador interno"
    },
    {
      id: "cable_2x1_50",
      name: "Cabo Paralelo 2x1,50mm²",
      sku: "CABO-2X1.50",
      category: "cable",
      description: "Cabo de áudio paralelo"
    },
    {
      id: "cable_2x2_50",
      name: "Cabo Paralelo 2x2,50mm²",
      sku: "CABO-2X2.50",
      category: "cable",
      description: "Cabo de áudio paralelo"
    },
    {
      id: "cable_2x4_00",
      name: "Cabo Paralelo 2x4,00mm²",
      sku: "CABO-2X4.00",
      category: "cable",
      description: "Cabo de áudio paralelo"
    },
    {
      id: "cable_cat6",
      name: "Cabo de Rede CAT6",
      sku: "CABO-CAT6",
      category: "cable",
      description: "Cabo UTP CAT6 para sistemas IP"
    }
  ]
};
