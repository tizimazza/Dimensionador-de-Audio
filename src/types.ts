export type ProjectType = 'single_room' | 'multi_zone' | 'cable_calc';
export type NoiseLevel = 'low' | 'medium' | 'high';
export type AcousticIsolation = 'poor' | 'average' | 'good';
export type UsageType = 'bgm' | 'paging' | 'voice_evac' | 'all';
export type SpeakerMountType = 'ceiling' | 'wall' | 'pendant' | 'horn';
export type ArchitectureType = 'analog_70v' | 'analog_low_z' | 'audio_over_ip' | 'matrix_dsp';

export interface SpeakerOption {
  id: string;
  name: string;
  sku: string;
  brand: string;
  mountType: SpeakerMountType;
  powerW: number;
  sensitivityDb: number;
  dispersionAngle: number;
  bestFor: string[];
  pros: string[];
}

export interface AmplifierOption {
  id: string;
  name: string;
  sku: string;
  brand: string;
  channels: number;
  powerPerChannelW: number;
  is70V: boolean;
  hasIP: boolean;
  pros: string[];
}

export interface AccessoryOption {
  id: string;
  name: string;
  sku: string;
  category: 'audio_over_ip_tx' | 'audio_over_ip_rx' | 'microphone' | 'player' | 'dsp_matrix' | 'paging_station' | 'cable';
  description: string;
}

export interface ConfigurableRules {
  version: string;
  lastUpdated: string;
  speakerCatalog: SpeakerOption[];
  amplifierCatalog: AmplifierOption[];
  accessoryCatalog: AccessoryOption[];
  adminEmail: string;
}

export interface WPSettings {
  copyEmail: string;
  colorPrimary?: string;
  colorSecondary?: string;
  productSkus: Record<string, string>;
}

export interface ZoneInput {
  id: string;
  name: string;
  measureType: 'area' | 'watts';
  value: number;
}

export type CoverageDensity = 'edge_to_edge' | 'minimum_overlap' | 'center_to_center';

export interface ProjectInputs {
  projectType: ProjectType;
  projectName?: string;
  clientName?: string;
  userEmail?: string;
  userPhone?: string;
  
  // Single room
  widthMeters: number;
  lengthMeters: number;
  ceilingHeightMeters: number;
  noiseLevel: NoiseLevel;
  acousticIsolation: AcousticIsolation;
  usageType: UsageType;
  mountingPreference: 'ceiling' | 'wall';
  environmentType: string;
  coverageDensity: CoverageDensity;

  // Multi zone / Signal distribution
  pagingMicCount: number;
  bgmSourcesCount: number;
  zoneCount: number;
  maxCableDistance: number;

  // Cable Calc
  cableCalcDistance: number;
  cableCalcPower: number;
  cableCalcImpedance: 'low' | 'high';
}

export interface BomItem {
  id: string;
  category: string;
  name: string;
  sku: string;
  brand: string;
  quantity: number;
  unit: string;
  notes: string;
}

export interface SizingResult {
  architectureName: string;
  architectureDescription: string;
  architectureReasoning: string;
  recommendedSpeakers: SpeakerOption[];
  recommendedAmplifiers: AmplifierOption[];
  recommendedAccessories: AccessoryOption[];
  bom: BomItem[];
  warnings: string[];
  bestPractices: string[];
  calculationExplanation?: string;
  diagramData: {
    type: ProjectType;
    
    // Single room data
    widthMeters?: number;
    lengthMeters?: number;
    speakerCount?: number;
    speakerType?: string;
    ampType?: string;
    isIpSystem?: boolean;
    speakerPositions?: Array<{x: number, y: number, radius: number, angle?: number, isWall?: boolean}>;
    estimatedSPL?: number;
    
    // Multi zone data
    sources?: string[];
    dspName?: string;
    amplifiers?: string[];
    zones?: { name: string; speakers: number; watts: number }[];
  };
}

export interface BrandThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  headerBgColor: string;
  accentColor: string;
  themeName: string;
}

