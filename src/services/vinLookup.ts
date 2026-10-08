import { invokeEdgeFunction } from './edgeFunctionErrors';
import { isVinShaped, normalizeVin, type VinSummary } from './vinDecode';

export type { VinSummary } from './vinDecode';

/** Decode a VIN through the decode-vin edge function (NHTSA vPIC). */
export async function lookupVin(input: string): Promise<VinSummary> {
  const vin = normalizeVin(input);
  if (!isVinShaped(vin)) {
    throw new Error('Enter all 17 characters of the VIN. VINs never use the letters I, O or Q.');
  }
  const { summary } = await invokeEdgeFunction<{ summary: VinSummary }>('decode-vin', { vin });
  return summary;
}
