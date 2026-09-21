import { ProjectInputs, SizingResult, ConfigurableRules, SpeakerOption, AmplifierOption, AccessoryOption } from '../types';

export function calculateSizing(inputs: ProjectInputs, config: ConfigurableRules): SizingResult {
  const result: SizingResult = {
    architectureName: '',
    architectureDescription: '',
    architectureReasoning: '',
    recommendedSpeakers: [],
    recommendedAmplifiers: [],
    recommendedAccessories: [],
    bom: [],
    warnings: [],
    bestPractices: [],
    calculationExplanation: '',
    diagramData: {
      type: inputs.projectType,
      widthMeters: inputs.widthMeters || 10,
      lengthMeters: inputs.lengthMeters || 10,
      speakerCount: 0,
      speakerType: '',
      ampType: '',
      isIpSystem: false,
      speakerPositions: []
    }
  };

  if (inputs.projectType === 'multi_zone') {
    return calculateMultiZone(inputs, config, result);
  }

  if (inputs.projectType === 'cable_calc') {
    return calculateCable(inputs, result, config);
  }

  // Single Room Logic
  const areaSqMeters = inputs.widthMeters * inputs.lengthMeters;

  // 1. Determinar Tipo de Alto-falante
  let selectedSpeaker: SpeakerOption;
  let coverageRadius = 3; // meters
  let effectiveHeight = Math.max(1, inputs.ceilingHeightMeters - 1.2);

  if (inputs.environmentType === 'outdoor' || inputs.environmentType === 'warehouse' || (inputs.ceilingHeightMeters > 5 && inputs.noiseLevel === 'high')) {
    selectedSpeaker = config.speakerCatalog.find(s => s.mountType === 'horn') || config.speakerCatalog[0];
    coverageRadius = 15;
    result.architectureReasoning += 'Ambiente amplo/ruidoso detectado. Recomendamos cornetas para maior alcance e inteligibilidade. ';
  } else if (inputs.mountingPreference === 'wall') {
    selectedSpeaker = config.speakerCatalog.find(s => s.sku === 'WORKPRO-NEO-3') || config.speakerCatalog.find(s => s.mountType === 'wall') || config.speakerCatalog[0];
    
    // Raio estimado com base na potência da caixa de parede
    coverageRadius = selectedSpeaker.powerW > 10 ? 6 : 4; 
    
    result.architectureReasoning += 'Preferência por fixação em parede (sobreposta). Caixas de parede oferecem bom direcionamento focal. ';
  } else {
    // Ceiling
    if (inputs.ceilingHeightMeters > 4) {
      selectedSpeaker = config.speakerCatalog.find(s => s.sku === 'WORKPRO-IC-5K-PRO') || config.speakerCatalog[0];
    } else if (inputs.noiseLevel === 'high') {
      selectedSpeaker = config.speakerCatalog.find(s => s.sku === 'WORKPRO-IC-611') || config.speakerCatalog[0];
    } else {
      selectedSpeaker = config.speakerCatalog.find(s => s.sku === 'WORKPRO-AMT-5') || config.speakerCatalog.find(s => s.mountType === 'ceiling') || config.speakerCatalog[0];
    }
    
    // Raio de cobertura baseado na altura: r = h_efetiva * tan(angulo/2)
    coverageRadius = effectiveHeight * Math.tan((selectedSpeaker.dispersionAngle / 2) * (Math.PI / 180));
    // Limites de segurança do raio
    coverageRadius = Math.max(2, Math.min(coverageRadius, 8));
    
    result.architectureReasoning += 'Preferência por teto (embutir). Utilizado cone de dispersão de ' + selectedSpeaker.dispersionAngle + ' graus para cálculo de raio. ';
  }

  let coverageArea = Math.PI * (coverageRadius * coverageRadius);

  // Se o nível de ruído é alto, precisamos de mais caixas (menor cobertura por caixa)
  if (inputs.noiseLevel === 'high' && selectedSpeaker.mountType !== 'horn') {
    coverageArea *= 0.6;
    coverageRadius *= 0.77; // sqrt(0.6)
    result.warnings.push('Nível de ruído alto detectado: Aumentamos a densidade de alto-falantes (reduzindo o raio de cobertura efetivo) para garantir inteligibilidade.');
  }

  // 2. Heatmap & Positions (Grid Distribution)
  let spacingMultiplier = 1.414; // minimum_overlap
  if (inputs.coverageDensity === 'edge_to_edge') {
    spacingMultiplier = 2.0;
  } else if (inputs.coverageDensity === 'center_to_center') {
    spacingMultiplier = 1.0;
  }
  
  result.architectureReasoning += ` Padrão de cobertura selecionado: ${inputs.coverageDensity === 'edge_to_edge' ? 'Borda-a-borda (menor densidade)' : inputs.coverageDensity === 'center_to_center' ? 'Centro-a-centro (alta densidade/sobreposição)' : 'Sobreposição Mínima (padrão)'}.`;

  const spacing = coverageRadius * spacingMultiplier; 
  
  let cols = Math.ceil(inputs.widthMeters / spacing);
  let rows = Math.ceil(inputs.lengthMeters / spacing);

  // Fallback for very small rooms
  if (cols === 0) cols = 1;
  if (rows === 0) rows = 1;

  const speakerCount = cols * rows;
  const positions = [];

  let totalPowerW = 0;
  if (selectedSpeaker.mountType === 'wall' || inputs.mountingPreference === 'wall') {
    // Para caixas de parede, o espaçamento longitudinal também obedece a lógica de cobertura.
    let colsWall = Math.max(1, Math.ceil(inputs.widthMeters / spacing));
    let rowsWall = Math.max(1, Math.ceil(inputs.lengthMeters / spacing));
    
    const isHorizontal = inputs.widthMeters >= inputs.lengthMeters; 
    let numPerWall = isHorizontal ? colsWall : rowsWall;
    
    // Opcional: alternar (stagger) caixas para não ficarem perfeitamente de frente
    let totalPlaced = 0;
    
    if (isHorizontal) {
       for (let w = 0; w < 2; w++) {
          const yPos = w === 0 ? 0 : inputs.lengthMeters;
          const angle = w === 0 ? 90 : 270;
          // Offset stagger para a segunda parede se for minimum_overlap ou center_to_center
          const offset = (w === 1 && numPerWall > 1) ? (inputs.widthMeters / numPerWall) / 2 : 0;
          for (let i = 0; i < numPerWall; i++) {
             let xPos = (i + 0.5) * (inputs.widthMeters / numPerWall) + offset;
             // Limitar dentro da sala
             if (xPos > inputs.widthMeters) xPos = inputs.widthMeters - 0.5;
             positions.push({ x: xPos, y: yPos, radius: coverageRadius, angle, isWall: true });
             totalPlaced++;
          }
       }
    } else {
       for (let w = 0; w < 2; w++) {
          const xPos = w === 0 ? 0 : inputs.widthMeters;
          const angle = w === 0 ? 0 : 180;
          const offset = (w === 1 && numPerWall > 1) ? (inputs.lengthMeters / numPerWall) / 2 : 0;
          for (let j = 0; j < numPerWall; j++) {
             let yPos = (j + 0.5) * (inputs.lengthMeters / numPerWall) + offset;
             if (yPos > inputs.lengthMeters) yPos = inputs.lengthMeters - 0.5;
             positions.push({ x: xPos, y: yPos, radius: coverageRadius, angle, isWall: true });
             totalPlaced++;
          }
       }
    }
    
    // Update speakerCount based on wall logic
    // We override the ceiling speakerCount logic
    result.diagramData.speakerCount = totalPlaced;
    totalPowerW = totalPlaced * selectedSpeaker.powerW;
  } else {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        positions.push({
          x: (i + 0.5) * (inputs.widthMeters / cols),
          y: (j + 0.5) * (inputs.lengthMeters / rows),
          radius: coverageRadius
        });
      }
    }
    totalPowerW = speakerCount * selectedSpeaker.powerW;
    result.diagramData.speakerCount = speakerCount;
  }

  result.recommendedSpeakers.push(selectedSpeaker);
  result.diagramData.speakerType = selectedSpeaker.name;
  result.diagramData.speakerPositions = positions;

  // Calculo de SPL (Nível de Pressão Sonora) estimado no chão
  // SPL = Sensibilidade (1W/1m) + 10 * log10(Potencia) - 20 * log10(Distancia)
  if (selectedSpeaker.sensitivityDb && selectedSpeaker.powerW && effectiveHeight > 0) {
    const spl = selectedSpeaker.sensitivityDb + (10 * Math.log10(selectedSpeaker.powerW)) - (20 * Math.log10(effectiveHeight));
    result.diagramData.estimatedSPL = Math.round(spl);
  }

  // 3. Determinar Arquitetura e Amplificador
  let selectedAmp: AmplifierOption;
  const requiresIp = inputs.usageType === 'all' || areaSqMeters > 500;
  
  if (requiresIp) {
    result.architectureName = 'Sistema de Áudio sobre IP Distribuído';
    result.architectureDescription = 'Zonamento flexível usando a rede de dados, permitindo controle individualizado e matriz de áudio virtual.';
    result.architectureReasoning += ' Devido ao tamanho da área (>500m²) ou necessidade de múltiplos usos (zonamento de aviso + música), optamos pelo sistema IP BlueLine.';
    selectedAmp = config.amplifierCatalog.find(a => a.hasIP) || config.amplifierCatalog[0];
    result.diagramData.isIpSystem = true;
  } else {
    result.architectureName = 'Sistema Analógico Linha 70V';
    result.architectureDescription = 'Ligação em cascata (daisy-chain) simplificada para cobrir a área com um único sinal de áudio.';
    result.architectureReasoning += ' Para esta área e uso, uma linha 70V tradicional oferece o melhor custo-benefício e facilidade de instalação em série.';
    
    if (totalPowerW > 240) {
      selectedAmp = config.amplifierCatalog.find(a => a.is70V && a.powerPerChannelW >= 500) || config.amplifierCatalog[0];
    } else if (totalPowerW > 120) {
      selectedAmp = config.amplifierCatalog.find(a => a.is70V && a.powerPerChannelW >= 240) || config.amplifierCatalog[0];
    } else if (totalPowerW > 65) {
      selectedAmp = config.amplifierCatalog.find(a => a.is70V && a.powerPerChannelW >= 120) || config.amplifierCatalog[0];
    } else {
      selectedAmp = config.amplifierCatalog.find(a => a.is70V && a.powerPerChannelW >= 65) || config.amplifierCatalog[0];
    }
    result.diagramData.isIpSystem = false;
  }

  // Verificação de potência
  const ampTotalPower = selectedAmp.channels * selectedAmp.powerPerChannelW;
  const requiredSafetyPowerW = totalPowerW * 1.2; // 20% de margem de segurança recomendada em alta impedância
  const ampsNeeded = Math.ceil(requiredSafetyPowerW / ampTotalPower);
  
  result.calculationExplanation = `Cálculo de Potência (Linha de Alta Impedância 70V/100V):\n` +
    `- Total de caixas: ${speakerCount}\n` +
    `- Potência por caixa (Tap): ${selectedSpeaker.powerW}W\n` +
    `- Carga Total (Nominal): ${totalPowerW}W\n` +
    `- Margem de Segurança Recomendada (20%): ${Math.ceil(requiredSafetyPowerW)}W\n` +
    `\nO amplificador sugerido (${selectedAmp.name}) entrega ${ampTotalPower}W, o que atende à carga total mais a margem de segurança.`;

  result.recommendedAmplifiers.push(selectedAmp);
  result.diagramData.ampType = selectedAmp.name;

  // 4. Acessórios
  const accs: AccessoryOption[] = [];
  if (requiresIp) {
    const tx = config.accessoryCatalog.find(a => a.category === 'audio_over_ip_tx');
    if (tx) {
      accs.push(tx);
      result.bom.push({ id: 'acc_tx', category: 'Transmissor IP', name: tx.name, sku: tx.sku, brand: 'Workpro', quantity: 1, unit: 'un', notes: 'Na fonte de áudio central.' });
    }
    const cat6 = config.accessoryCatalog.find(a => a.id === 'cable_cat6');
    if (cat6) {
      accs.push(cat6);
      result.bom.push({ id: cat6.id, category: 'Cabeamento', name: cat6.name, sku: cat6.sku, brand: 'Discabos', quantity: 1, unit: 'cx', notes: 'Caixa de 305m (estimativa para infraestrutura de rede IP)' });
    }
  }
  if (inputs.usageType === 'paging' || inputs.usageType === 'all' || inputs.usageType === 'voice_evac') {
    let micId = requiresIp ? 'acc_sps8' : 'acc_dm1n'; // SPS 8 is paging station for IP, DM 1 N for analog
    let mic = config.accessoryCatalog.find(a => a.id === micId);
    
    // Fallback if specific id not found
    if (!mic) {
      mic = config.accessoryCatalog.find(a => a.category === (requiresIp ? 'paging_station' : 'microphone'));
    }

    if (mic) {
      accs.push(mic);
      result.bom.push({ id: 'acc_mic', category: 'Microfone', name: mic.name, sku: mic.sku, brand: 'Workpro', quantity: 1, unit: 'un', notes: 'Para a recepção / guarita.' });
    }
  }

  result.recommendedAccessories = accs;

  // 5. Montar BOM
  let speakerQuantity = speakerCount;
  let speakerUnit = 'un';
  let speakerNotes = `Cobertura estimada: ${coverageArea.toFixed(1)}m²/caixa`;

  if (selectedSpeaker.sku === 'WORKPRO-NEO-3') {
    speakerQuantity = Math.ceil(speakerCount / 2);
    speakerUnit = 'par';
    speakerNotes = `Caixa vendida em pares. Total: ${speakerCount} unidades.`;
  }

  result.bom.push({
    id: 'spk_main',
    category: 'Alto-falantes',
    name: selectedSpeaker.name,
    sku: selectedSpeaker.sku,
    brand: selectedSpeaker.brand,
    quantity: speakerQuantity,
    unit: speakerUnit,
    notes: speakerNotes
  });

  result.bom.push({
    id: 'amp_main',
    category: 'Amplificação',
    name: selectedAmp.name,
    sku: selectedAmp.sku,
    brand: selectedAmp.brand,
    quantity: ampsNeeded,
    unit: 'un',
    notes: `Carga total estimada: ${totalPowerW}W`
  });

  result.bom.push({
    id: 'cab_audio',
    category: 'Cabeamento',
    name: 'Cabo de Áudio Bipolar (Rolo 100m)',
    sku: 'CABO-AUDIO-16AWG',
    brand: 'Discabos',
    quantity: Math.ceil((speakerCount * 15) / 100),
    unit: 'rolo',
    notes: 'Estimativa básica de 15m por caixa na malha.'
  });

  // Best practices
  result.bestPractices.push('Respeite a regra de 20% de margem de segurança no amplificador: Nunca carregue-o além de 80% da sua capacidade nominal total.');
  if (selectedAmp.is70V) {
    result.bestPractices.push('Faça a ligação das caixas em paralelo na linha 70V, certificando-se de somar a potência dos transformadores.');
  }

  result.calculationExplanation = `Distribuição matemática (Grid-Layout): Com pé direito de ${inputs.ceilingHeightMeters}m e ouvintes a 1.2m, a altura efetiva é ${effectiveHeight.toFixed(1)}m. A caixa ${selectedSpeaker.name} tem um ângulo de ${selectedSpeaker.dispersionAngle}º, resultando em um raio de cobertura no chão de ${coverageRadius.toFixed(1)}m. O espaçamento ideal é de ~${(coverageRadius * 1.5).toFixed(1)}m entre caixas.`;

  return result;
}

function calculateMultiZone(inputs: ProjectInputs, config: ConfigurableRules, result: SizingResult): SizingResult {
  const zones = inputs.zoneCount || 1;
  
  // Decide Architecture: IP vs Analog Matrix
  const requiresIp = (inputs.maxCableDistance || 0) > 100 || (inputs.pagingMicCount || 0) > 1 || zones > 4;

  if (requiresIp) {
    result.architectureName = 'Sistema Multi-Zonas (Áudio sobre IP - BlueLine)';
    result.architectureDescription = 'Arquitetura setorizada 100% digital usando a rede local (LAN). Ideal para cobrir grandes distâncias sem perda de sinal e interligar múltiplas estações.';
    
    let reasons = [];
    if ((inputs.maxCableDistance || 0) > 100) reasons.push(`Distância informada (${inputs.maxCableDistance}m) eleva muito o custo e a atenuação do cabeamento de potência de cobre, justificando o uso de dados (IP).`);
    if ((inputs.pagingMicCount || 0) > 1) reasons.push(`A necessidade de ${inputs.pagingMicCount} bases de microfone é melhor resolvida via rede, evitando cabos analógicos longos e ruídos.`);
    if (zones > 4) reasons.push(`Quantidade elevada de setores (${zones}) torna a infraestrutura distribuída IP muito mais escalável.`);
    
    result.architectureReasoning = reasons.join(' ');
    result.calculationExplanation = `Lógica de Distribuição: A central apenas joga o áudio na rede via transmissores (BLS). Amplificadores IP ou receptores (BLR) devem ser alocados fisicamente dentro de cada um dos ${zones} setores, puxando o sinal da rede de forma independente.`;
    result.diagramData.isIpSystem = true;
  } else {
    result.architectureName = 'Sistema Multi-Zonas (Matriz Analógica)';
    result.architectureDescription = 'Arquitetura centralizada, onde todos os cabos (zonas e microfones) convergem para uma Matriz DSP no mesmo rack.';
    result.architectureReasoning = `Como as distâncias são curtas (${inputs.maxCableDistance}m) e há limite de zonas/microfones, concentrar o processamento numa Matriz 4x4 no rack principal (Head-end) oferece o melhor custo-benefício.`;
    result.calculationExplanation = `Lógica de Distribuição: O sinal será distribuído a partir do Rack Central para todos os ${zones} setores usando cabo de potência RCA ou paralelo (linha 70V).`;
    result.diagramData.isIpSystem = false;
  }

  result.diagramData.type = 'multi_zone';
  result.diagramData.sources = [];
  result.diagramData.amplifiers = [];
  result.diagramData.zones = [];

  let dspName = '';
  
  if (requiresIp) {
    dspName = 'Switch de Rede (IP)';
  } else {
    const dsp = config.accessoryCatalog.find(a => a.sku === 'WORKPRO-WPE-44') || config.accessoryCatalog.find(a => a.category === 'dsp_matrix');
    if (dsp) {
      result.bom.push({ id: 'dsp_matrix', category: 'Matriz DSP / Controle', name: dsp.name, sku: dsp.sku, brand: 'Workpro', quantity: 1, unit: 'un', notes: 'Matriz central 4x4.' });
      dspName = dsp.name;
    }
  }
  result.diagramData.dspName = dspName;

  // Paging & BGM Sources
  if ((inputs.pagingMicCount || 0) > 0) {
    if (requiresIp) {
      const paging = config.accessoryCatalog.find(a => a.sku === 'WORKPRO-SPS-8') || config.accessoryCatalog.find(a => a.category === 'paging_station');
      if (paging) {
        result.bom.push({ id: 'paging_mic_ip', category: 'Microfone de Paging IP', name: paging.name, sku: paging.sku, brand: 'Workpro', quantity: inputs.pagingMicCount || 1, unit: 'un', notes: 'Console endereçável IP de mesa.' });
        result.diagramData.sources.push(`${inputs.pagingMicCount}x SPS 8 (IP)`);
      }
    } else {
      result.bom.push({ id: 'paging_mic_analog', category: 'Microfone de Paging', name: 'Microfone de Mesa Analógico', sku: 'MIC-ANALOG-01', brand: 'Workpro', quantity: inputs.pagingMicCount || 1, unit: 'un', notes: 'Ligado direto à Matriz.' });
      result.diagramData.sources.push(`${inputs.pagingMicCount}x Mic Analógico`);
    }
  }

  if ((inputs.bgmSourcesCount || 0) > 0) {
    if (requiresIp) {
      const bls = config.accessoryCatalog.find(a => a.sku === 'WORKPRO-BLS-SD') || config.accessoryCatalog.find(a => a.category === 'audio_over_ip_tx');
      if (bls) {
        result.bom.push({ id: 'bgm_source_ip', category: 'Fonte de Áudio IP', name: bls.name, sku: bls.sku, brand: 'Workpro', quantity: inputs.bgmSourcesCount || 1, unit: 'un', notes: 'Player SD e transmissor BlueLine.' });
        result.diagramData.sources.push(`${inputs.bgmSourcesCount}x BLS SD (BGM IP)`);
      }
    } else {
      result.bom.push({ id: 'bgm_source_analog', category: 'Fonte de Áudio', name: 'Media Player de Rack', sku: 'PLAYER-01', brand: 'Workpro', quantity: inputs.bgmSourcesCount || 1, unit: 'un', notes: 'Ligado nas entradas da Matriz.' });
      result.diagramData.sources.push(`${inputs.bgmSourcesCount}x Media Player`);
    }
  }

  // Generate generic zones for diagram
  for (let i = 1; i <= zones; i++) {
     result.diagramData.zones!.push({ name: `Setor ${i}`, speakers: 0, watts: 0 });
  }

  // Routing output to zones
  if (requiresIp) {
     const blr2 = config.accessoryCatalog.find(a => a.sku === 'WORKPRO-BLR-2');
     if (blr2) {
         result.bom.push({ id: `blr2_zones`, category: 'Receptor IP', name: blr2.name, sku: blr2.sku, brand: 'Workpro', quantity: zones, unit: 'un', notes: `Um receptor distribuído por setor` });
         result.diagramData.amplifiers!.push(`${zones}x Receptor IP (BLR)`);
     }
     const cat6 = config.accessoryCatalog.find(a => a.id === 'cable_cat6');
     if (cat6) {
         result.bom.push({ id: cat6.id, category: 'Cabeamento', name: cat6.name, sku: cat6.sku, brand: 'Discabos', quantity: Math.ceil(zones / 2), unit: 'cx', notes: 'Caixas de 305m (estimativa baseada no número de zonas IP)' });
     }
     result.bestPractices.push('Como trata-se de um sistema sobre IP, valide a disponibilidade de portas no Switch local e se a infra suporta PoE (para os transmissores). Apenas será levado cabo de rede para cada um dos setores.');
  } else {
     result.bestPractices.push('Para grandes distâncias na Matriz Analógica, lembre-se de usar cabos de cobre de bitola generosa (Ex: 14 AWG) na saída de linha 70V para evitar atenuação.');
     result.diagramData.amplifiers!.push(`Saídas da Matriz Analógica`);
  }

  return result;
}

function calculateCable(inputs: ProjectInputs, result: SizingResult, config: ConfigurableRules): SizingResult {
   const distance = inputs.cableCalcDistance || 1;
   const power = inputs.cableCalcPower || 1;
   const isLow = inputs.cableCalcImpedance === 'low';

   result.architectureName = 'Dimensionamento de Cabo Paralelo';
   
   let mm2 = 1.0;
   let notes = '';

   if (isLow) {
      result.architectureDescription = 'Cálculo para sistema de Baixa Impedância (4 a 8 Ohms).';
      result.architectureReasoning = 'Em baixa impedância, a corrente é mais alta e a resistência do cabo causa perdas drásticas muito rapidamente. Cabos longos não são recomendados.';
      
      // Basic rule of thumb for 8 ohms allowing ~5% power loss
      if (distance <= 15) { mm2 = 1.5; }
      else if (distance <= 24) { mm2 = 2.5; }
      else { 
         mm2 = 4.0; 
         if (distance > 36) {
             result.warnings.push('ATENÇÃO: Distância crítica para baixa impedância. Considere mudar para Linha 70V/100V para evitar perdas extremas de sinal.');
         }
      }
   } else {
      result.architectureDescription = 'Cálculo para sistema de Alta Impedância (Linha 70V / 100V).';
      result.architectureReasoning = 'A alta voltagem diminui a corrente, permitindo o uso de cabos mais finos para grandes distâncias. O fator limitante passa a ser a soma total de potência exigida e o comprimento.';
      
      // High Z rule of thumb
      const loadFactor = distance * power; // V-A-m approximation
      if (loadFactor <= 40000) { mm2 = 1.5; }
      else if (loadFactor <= 75000) { mm2 = 2.5; }
      else { mm2 = 4.0; }
   }

   result.calculationExplanation = `Recomendamos o uso de **Cabo Paralelo 2x${mm2.toFixed(2).replace('.', ',')}mm²** para transportar ${power}W a uma distância de ${distance}m com segurança e perdas aceitáveis.`;

   const cableId = mm2 === 1.5 ? "cable_2x1_50" : mm2 === 2.5 ? "cable_2x2_50" : "cable_2x4_00";
   const cableAcc = config.accessoryCatalog.find((a: any) => a.id === cableId);
   if (cableAcc) {
      result.bom.push({
         id: cableAcc.id,
         category: 'Cabeamento',
         name: cableAcc.name,
         sku: cableAcc.sku,
         brand: 'Discabos',
         quantity: distance,
         unit: 'm',
         notes: 'Atenção: Adicione margem de sobra para a instalação.'
      });
   }

   result.bestPractices.push(`Sempre utilize cabos 100% cobre estanhado (OFC) para instalações definitivas. Cabos CCA (Alumínio cobreado) possuem maior resistência e exigem bitolas ainda maiores.`);
   result.bestPractices.push(`Para cabos que passarão em tubulações junto à rede elétrica (não recomendado), certifique-se que o cabo de áudio possua blindagem ou utilize infraestrutura independente para evitar ruídos de indução.`);

   result.diagramData.type = 'single_room'; // Fallback for diagram UI to not crash, though we might not show it
   return result;
}
