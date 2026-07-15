// BMW E60 Coder Pro - DME Flash Engine with Checksum Validation
// Supports MSD80/MSD81 DME memory layout with full checksum verification

import type { BackupSector } from '@/types';

// BMW DME Memory Layout Definitions
export interface FlashSectorDef {
  name: string;
  startAddress: number;
  size: number;
  isBootSector: boolean;
  writable: boolean;
  checksumOffset?: number;
}

export interface ParsedFlashFile {
  data: Uint8Array;
  ecuType: string;
  dmeFamily: string;
  softwareVersion: string;
  softwareDate: string;
  vin: string;
  isValid: boolean;
  size: number;
  sectors: BackupSector[];
  checksumsValid: boolean;
  errors: string[];
}

export interface ChecksumResult {
  sector: string;
  address: string;
  expected: string;
  computed: string;
  valid: boolean;
  algorithm: string;
}

// MSD80/MSD81 DME Memory Layout (2MB flash)
export const MSD80_SECTORS: FlashSectorDef[] = [
  { name: 'Bootloader', startAddress: 0x000000, size: 0x10000, isBootSector: true, writable: false, checksumOffset: 0x0FFFC },
  { name: 'Program 0', startAddress: 0x010000, size: 0x20000, isBootSector: false, writable: true, checksumOffset: 0x02FFFC },
  { name: 'Program 1', startAddress: 0x030000, size: 0x20000, isBootSector: false, writable: true, checksumOffset: 0x04FFFC },
  { name: 'Program 2', startAddress: 0x050000, size: 0x20000, isBootSector: false, writable: true, checksumOffset: 0x06FFFC },
  { name: 'Program 3', startAddress: 0x070000, size: 0x20000, isBootSector: false, writable: true, checksumOffset: 0x08FFFC },
  { name: 'Calibration 0', startAddress: 0x090000, size: 0x40000, isBootSector: false, writable: true, checksumOffset: 0x0CFFFC },
  { name: 'Calibration 1', startAddress: 0x0D0000, size: 0x40000, isBootSector: false, writable: true, checksumOffset: 0x10FFFC },
  { name: 'Calibration 2', startAddress: 0x110000, size: 0x40000, isBootSector: false, writable: true, checksumOffset: 0x14FFFC },
  { name: 'Calibration 3', startAddress: 0x150000, size: 0x40000, isBootSector: false, writable: true, checksumOffset: 0x18FFFC },
  { name: 'Full Calibration', startAddress: 0x190000, size: 0x60000, isBootSector: false, writable: true, checksumOffset: 0x1EFFFC },
];

export const MSD81_SECTORS: FlashSectorDef[] = [
  { name: 'Bootloader', startAddress: 0x000000, size: 0x10000, isBootSector: true, writable: false, checksumOffset: 0x0FFFC },
  { name: 'Program 0', startAddress: 0x010000, size: 0x20000, isBootSector: false, writable: true, checksumOffset: 0x02FFFC },
  { name: 'Program 1', startAddress: 0x030000, size: 0x20000, isBootSector: false, writable: true, checksumOffset: 0x04FFFC },
  { name: 'Program 2', startAddress: 0x050000, size: 0x20000, isBootSector: false, writable: true, checksumOffset: 0x06FFFC },
  { name: 'Program 3', startAddress: 0x070000, size: 0x20000, isBootSector: false, writable: true, checksumOffset: 0x08FFFC },
  { name: 'Calibration 0', startAddress: 0x090000, size: 0x40000, isBootSector: false, writable: true, checksumOffset: 0x0CFFFC },
  { name: 'Calibration 1', startAddress: 0x0D0000, size: 0x40000, isBootSector: false, writable: true, checksumOffset: 0x10FFFC },
  { name: 'Calibration 2', startAddress: 0x110000, size: 0x40000, isBootSector: false, writable: true, checksumOffset: 0x14FFFC },
  { name: 'Calibration 3', startAddress: 0x150000, size: 0x40000, isBootSector: false, writable: true, checksumOffset: 0x18FFFC },
  { name: 'Full Calibration', startAddress: 0x190000, size: 0x60000, isBootSector: false, writable: true, checksumOffset: 0x1EFFFC },
];

// Checksum Algorithms

/**
 * BMW CRC-16 (poly 0x8005, init 0xFFFF)
 */
export function bmwCRC16(data: Uint8Array, offset: number, length: number): number {
  let crc = 0xFFFF;
  for (let i = 0; i < length; i++) {
    crc ^= data[offset + i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x8005) : (crc << 1);
    }
    crc &= 0xFFFF;
  }
  return crc;
}

/**
 * CRC-16 CCITT (poly 0x1021, init 0xFFFF)
 */
export function crc16CCITT(data: Uint8Array, offset: number, length: number): number {
  let crc = 0xFFFF;
  for (let i = 0; i < length; i++) {
    crc ^= data[offset + i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
    crc &= 0xFFFF;
  }
  return crc;
}

/**
 * CRC-32 (IEEE 802.3)
 */
export function crc32(data: Uint8Array, offset: number, length: number): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < length; i++) {
    crc ^= data[offset + i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
    }
  }
  return (~crc) >>> 0;
}

/**
 * Simple 32-bit sum checksum (BMW variant)
 */
export function sum32(data: Uint8Array, offset: number, length: number): number {
  let sum = 0;
  for (let i = 0; i < length; i += 4) {
    let val = 0;
    for (let b = 0; b < 4 && (i + b) < length; b++) {
      val |= data[offset + i + b] << (b * 8);
    }
    sum = (sum + val) >>> 0;
  }
  return sum;
}

/**
 * Compute checksum for a sector using the specified algorithm
 */
export function computeSectorChecksum(
  data: Uint8Array,
  sector: FlashSectorDef,
  algorithm: 'bmw_crc16' | 'crc16_ccitt' | 'crc32' | 'sum32' = 'bmw_crc16'
): number {
  const payloadEnd = sector.checksumOffset !== undefined
    ? sector.checksumOffset - sector.startAddress
    : sector.size - 4;

  switch (algorithm) {
    case 'bmw_crc16':
      return bmwCRC16(data, sector.startAddress, payloadEnd);
    case 'crc16_ccitt':
      return crc16CCITT(data, sector.startAddress, payloadEnd);
    case 'crc32':
      return crc32(data, sector.startAddress, payloadEnd);
    case 'sum32':
      return sum32(data, sector.startAddress, payloadEnd);
    default:
      return bmwCRC16(data, sector.startAddress, payloadEnd);
  }
}

/**
 * Read the stored checksum from flash data at the sector's checksum offset
 */
export function readStoredChecksum(data: Uint8Array, sector: FlashSectorDef): number {
  if (sector.checksumOffset === undefined) return 0;
  const off = sector.checksumOffset;
  return (data[off] | (data[off + 1] << 8) | (data[off + 2] << 16) | (data[off + 3] << 24)) >>> 0;
}

/**
 * Write checksum into flash data at sector's checksum offset
 */
export function writeChecksum(data: Uint8Array, sector: FlashSectorDef, checksum: number): void {
  if (sector.checksumOffset === undefined) return;
  const off = sector.checksumOffset;
  data[off] = checksum & 0xFF;
  data[off + 1] = (checksum >> 8) & 0xFF;
  data[off + 2] = (checksum >> 16) & 0xFF;
  data[off + 3] = (checksum >> 24) & 0xFF;
}

/**
 * Validate all sector checksums in a flash file
 */
export function validateChecksums(
  data: Uint8Array,
  sectors: FlashSectorDef[],
  algorithm: 'bmw_crc16' | 'crc16_ccitt' | 'crc32' | 'sum32' = 'bmw_crc16'
): ChecksumResult[] {
  return sectors.map(sector => {
    const stored = readStoredChecksum(data, sector);
    const computed = computeSectorChecksum(data, sector, algorithm);
    return {
      sector: sector.name,
      address: `0x${sector.startAddress.toString(16).toUpperCase().padStart(6, '0')}`,
      expected: `0x${stored.toString(16).toUpperCase().padStart(8, '0')}`,
      computed: `0x${computed.toString(16).toUpperCase().padStart(8, '0')}`,
      valid: stored === computed,
      algorithm,
    };
  });
}

/**
 * Fix all checksums in a flash file (recompute and write)
 */
export function fixChecksums(
  data: Uint8Array,
  sectors: FlashSectorDef[],
  algorithm: 'bmw_crc16' | 'crc16_ccitt' | 'crc32' | 'sum32' = 'bmw_crc16'
): ChecksumResult[] {
  return sectors.map(sector => {
    if (sector.isBootSector || !sector.writable) {
      return {
        sector: sector.name,
        address: `0x${sector.startAddress.toString(16).toUpperCase().padStart(6, '0')}`,
        expected: '0x00000000',
        computed: '0x00000000',
        valid: true,
        algorithm: 'skipped',
      };
    }
    const computed = computeSectorChecksum(data, sector, algorithm);
    writeChecksum(data, sector, computed);
    return {
      sector: sector.name,
      address: `0x${sector.startAddress.toString(16).toUpperCase().padStart(6, '0')}`,
      expected: `0x${computed.toString(16).toUpperCase().padStart(8, '0')}`,
      computed: `0x${computed.toString(16).toUpperCase().padStart(8, '0')}`,
      valid: true,
      algorithm,
    };
  });
}

/**
 * Parse a flash file (.bin, .ori, .mod, .fls)
 */
export function parseFlashFile(arrayBuffer: ArrayBuffer): ParsedFlashFile {
  const data = new Uint8Array(arrayBuffer);
  const size = data.length;
  const errors: string[] = [];

  // Detect ECU type from file size and signatures
  let ecuType = 'Unknown';
  let dmeFamily = 'Unknown';
  let sectors = MSD80_SECTORS;

  if (size === 0x200000) {
    ecuType = 'MSD80/MSD81';
    dmeFamily = 'MEVD17.2';
    sectors = MSD81_SECTORS;
  } else if (size === 0x400000) {
    ecuType = 'MSD85/MSD87';
    dmeFamily = 'MEVD17.2.6';
    sectors = MSD81_SECTORS.map(s => ({ ...s, size: s.size * 2 }));
  } else if (size > 0) {
    errors.push(`Unusual file size: ${size} bytes (expected 2MB or 4MB for BMW DME)`);
    ecuType = 'Unknown';
    dmeFamily = 'Unknown';
  } else {
    errors.push('Empty file');
  }

  // Extract VIN from flash (BMW VIN stored at offset 0x400 for MSD80/81)
  let vin = '';
  try {
    const vinBytes: number[] = [];
    for (let i = 0x400; i < 0x411 && i < size; i++) {
      const c = data[i];
      if (c >= 0x20 && c < 0x7F) vinBytes.push(c);
    }
    vin = String.fromCharCode(...vinBytes).trim();
  } catch {
    vin = '';
  }

  // Extract software version (typically at offset 0x420)
  let softwareVersion = '';
  let softwareDate = '';
  try {
    const swBytes: number[] = [];
    for (let i = 0x420; i < 0x440 && i < size; i++) {
      const c = data[i];
      if (c >= 0x20 && c < 0x7F) swBytes.push(c);
    }
    softwareVersion = String.fromCharCode(...swBytes).trim();
  } catch {
    softwareVersion = '';
  }

  // Validate checksums
  let checksumsValid = true;
  const checksumResults = validateChecksums(data, sectors);
  const failedChecksums = checksumResults.filter(r => !r.valid);
  if (failedChecksums.length > 0) {
    checksumsValid = false;
    errors.push(`${failedChecksums.length} sector checksum(s) invalid`);
  }

  // Build sector list
  const sectorList: BackupSector[] = sectors.map(s => ({
    name: s.name,
    startAddress: `0x${s.startAddress.toString(16).toUpperCase().padStart(6, '0')}`,
    size: s.size,
    checksum: checksumResults.find(r => r.sector === s.name)?.computed || '0x00000000',
    backedUp: false,
  }));

  return {
    data,
    ecuType,
    dmeFamily,
    softwareVersion,
    softwareDate,
    vin,
    isValid: size >= 0x10000 && errors.length === 0,
    size,
    sectors: sectorList,
    checksumsValid,
    errors,
  };
}

/**
 * Build flash operations plan from parsed file
 */
export interface FlashOperation {
  sector: string;
  startAddress: number;
  size: number;
  checksum: string;
  isCalibration: boolean;
}

export function buildFlashOperations(parsed: ParsedFlashFile): FlashOperation[] {
  return parsed.sectors
    .filter(s => s.name.toLowerCase().includes('calibration') || s.name.toLowerCase().includes('program'))
    .map(s => ({
      sector: s.name,
      startAddress: parseInt(s.startAddress, 16),
      size: s.size,
      checksum: s.checksum,
      isCalibration: s.name.toLowerCase().includes('calibration'),
    }));
}

/**
 * Get ECU type from file size
 */
export function detectEcuType(size: number): string {
  if (size === 0x200000) return 'MSD80/MSD81 (2MB)';
  if (size === 0x400000) return 'MSD85/MSD87 (4MB)';
  if (size === 0x80000) return 'MS42/MS43 (512KB)';
  if (size === 0x100000) return 'MSD70/MSD80 Early (1MB)';
  return `Unknown (${(size / 1024 / 1024).toFixed(2)}MB)`;
}

/**
 * Verify if a file looks like a valid BMW DME flash file
 */
export function isValidFlashFile(data: Uint8Array): boolean {
  // Check size
  if (data.length < 0x10000) return false;

  // Check for BMW signature bytes at various known offsets
  const bmwSig1 = data[0] === 0x00 && data[1] === 0x00 && data[2] === 0x00 && data[3] === 0x20;
  const bmwSig2 = data[0x400] >= 0x20 && data[0x400] < 0x7F; // VIN area should be ASCII

  return bmwSig1 || bmwSig2;
}

/**
 * Read tune name/description from file if embedded
 */
export function extractTuneInfo(data: Uint8Array): { name: string; author: string; date: string } {
  let name = '';
  let author = '';
  let date = '';

  // Try to find tune info in common metadata locations
  const metadataOffsets = [0x1F0000, 0x1E0000, 0x1D0000];
  for (const off of metadataOffsets) {
    if (off + 128 > data.length) continue;
    const bytes: number[] = [];
    for (let i = off; i < off + 128 && i < data.length; i++) {
      const c = data[i];
      if (c === 0) break;
      if (c >= 0x20 && c < 0x7F) bytes.push(c);
    }
    const text = String.fromCharCode(...bytes).trim();
    if (text.length > 5) {
      const parts = text.split('|');
      name = parts[0]?.trim() || '';
      author = parts[1]?.trim() || '';
      date = parts[2]?.trim() || '';
      if (name) break;
    }
  }

  return { name, author, date };
}

export default {
  parseFlashFile,
  validateChecksums,
  fixChecksums,
  buildFlashOperations,
  detectEcuType,
  isValidFlashFile,
  extractTuneInfo,
  bmwCRC16,
  crc16CCITT,
  crc32,
  sum32,
  MSD80_SECTORS,
  MSD81_SECTORS,
};
