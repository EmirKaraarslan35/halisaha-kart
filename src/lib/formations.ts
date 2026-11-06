export interface FormationPreset {
  name: string
  lines: number[] // [Kaleci, Defans, Orta, Forvet]
  totalPlayers: number
}

export const PRESET_FORMATIONS: FormationPreset[] = [
  // 7 Kişilik Halı Saha (En Popüler)
  { name: '2-3-1 (Dengeli)', lines: [1, 2, 3, 1], totalPlayers: 7 },
  { name: '3-2-1 (Savunma)', lines: [1, 3, 2, 1], totalPlayers: 7 },
  { name: '2-2-2 (Dinamik)', lines: [1, 2, 2, 2], totalPlayers: 7 },
  { name: '1-3-2 (Hücum)', lines: [1, 1, 3, 2], totalPlayers: 7 },
  { name: '3-1-2 (Kontra)', lines: [1, 3, 1, 2], totalPlayers: 7 },

  // 6 Kişilik Halı Saha
  { name: '2-2-1', lines: [1, 2, 2, 1], totalPlayers: 6 },
  { name: '2-1-2', lines: [1, 2, 1, 2], totalPlayers: 6 },
  { name: '3-1-1', lines: [1, 3, 1, 1], totalPlayers: 6 },

  // 8 Kişilik Halı Saha
  { name: '3-3-1', lines: [1, 3, 3, 1], totalPlayers: 8 },
  { name: '2-3-2', lines: [1, 2, 3, 2], totalPlayers: 8 },
  { name: '3-2-2', lines: [1, 3, 2, 2], totalPlayers: 8 },

  // 5 Kişilik (Mini Saha)
  { name: '1-2-1', lines: [1, 1, 2, 1], totalPlayers: 5 },
  { name: '2-1-1', lines: [1, 2, 1, 1], totalPlayers: 5 },
]

export function getDefaultPositionLabel(lineIndex: number, totalLines: number, posIndexInLine: number, totalInLine: number): string {
  // 1. Hat: Kaleci
  if (lineIndex === 0) return 'KL'

  // Son Hat: Forvet
  if (lineIndex === totalLines - 1) {
    if (totalInLine === 1) return 'FV'
    if (totalInLine === 2) return posIndexInLine === 0 ? 'SLF' : 'SĞF'
    if (totalInLine === 3) {
      if (posIndexInLine === 0) return 'SLF'
      if (posIndexInLine === 1) return 'FV'
      return 'SĞF'
    }
    return 'FV'
  }

  // 2. Hat (Defans)
  if (lineIndex === 1) {
    if (totalInLine === 1) return 'STP'
    if (totalInLine === 2) return posIndexInLine === 0 ? 'SLB' : 'SĞB'
    if (totalInLine === 3) {
      if (posIndexInLine === 0) return 'SLB'
      if (posIndexInLine === 1) return 'STP'
      return 'SĞB'
    }
    if (totalInLine >= 4) {
      if (posIndexInLine === 0) return 'SLB'
      if (posIndexInLine === totalInLine - 1) return 'SĞB'
      return 'STP'
    }
  }

  // Orta Saha Hatları
  if (totalInLine === 1) return 'OS'
  if (totalInLine === 2) return posIndexInLine === 0 ? 'OS' : 'OS'
  if (totalInLine === 3) {
    if (posIndexInLine === 0) return 'SLK'
    if (posIndexInLine === 1) return 'OS'
    return 'SĞK'
  }
  if (totalInLine >= 4) {
    if (posIndexInLine === 0) return 'SLK'
    if (posIndexInLine === totalInLine - 1) return 'SĞK'
    return 'OS'
  }

  return 'OS'
}

export interface GeneratedSlot {
  slot_index: number
  line_index: number
  position_label: string
}

export function generateSlotsForFormation(lines: number[]): GeneratedSlot[] {
  const slots: GeneratedSlot[] = []
  let globalSlotIndex = 0

  lines.forEach((count, lineIndex) => {
    for (let i = 0; i < count; i++) {
      const position_label = getDefaultPositionLabel(lineIndex, lines.length, i, count)
      slots.push({
        slot_index: globalSlotIndex++,
        line_index: lineIndex,
        position_label,
      })
    }
  })

  return slots
}
