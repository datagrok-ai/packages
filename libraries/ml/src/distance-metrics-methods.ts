import BitArray from '@datagrok-libraries/utils/src/bit-array';
import { BitArrayMetricsNames } from './typed-metrics/consts';

export const similarityMetric: { [name: string]: (x: BitArray, y: BitArray) => number } = {
  [BitArrayMetricsNames.Tanimoto]: tanimotoSimilarity,
  [BitArrayMetricsNames.Dice]: diceSimilarity,
  [BitArrayMetricsNames.Asymmetric]: asymmetricSimilarity,
  [BitArrayMetricsNames.BraunBlanquet]: braunBlanquetSimilarity,
  [BitArrayMetricsNames.Cosine]: cosineSimilarity,
  [BitArrayMetricsNames.Kulczynski]: kulczynskiSimilarity,
  [BitArrayMetricsNames.McConnaughey]: mcConnaugheySimilarity,
  [BitArrayMetricsNames.RogotGoldberg]: rogotGoldbergSimilarity,
  [BitArrayMetricsNames.Russel]: russelSimilarity,
  [BitArrayMetricsNames.Sokal]: sokalSimilarity,
  [BitArrayMetricsNames.Hamming]: hammingSimilarity,
  [BitArrayMetricsNames.Euclidean]: euclideanSimilarity,
};

export const distanceMetrics: { [name: string]: (x: BitArray, y: BitArray) => number } = {
  [BitArrayMetricsNames.Tanimoto]: tanimotoDistance,
  [BitArrayMetricsNames.Dice]: diceDistance,
  [BitArrayMetricsNames.Asymmetric]: asymmetricDistance,
  [BitArrayMetricsNames.BraunBlanquet]: braunBlanquetDistance,
  [BitArrayMetricsNames.Cosine]: cosineDistance,
  [BitArrayMetricsNames.Kulczynski]: kulczynskiDistance,
  [BitArrayMetricsNames.McConnaughey]: mcConnaugheyDistance,
  [BitArrayMetricsNames.RogotGoldberg]: rogotGoldbergDistance,
  [BitArrayMetricsNames.Russel]: russelDistance,
  [BitArrayMetricsNames.Sokal]: sokalDistance,
  [BitArrayMetricsNames.Hamming]: hammingDistance,
  [BitArrayMetricsNames.Euclidean]: euclideanDistance,
};

export const CHEM_SIMILARITY_METRICS = [
  BitArrayMetricsNames.Tanimoto,
  BitArrayMetricsNames.Dice,
  BitArrayMetricsNames.Cosine];
export const SEQ_SPACE_SIMILARITY_METRICS = [
  BitArrayMetricsNames.Tanimoto,
  BitArrayMetricsNames.Asymmetric,
  BitArrayMetricsNames.Cosine,
  BitArrayMetricsNames.Sokal ];

export function tanimotoSimilarity(x: BitArray, y: BitArray): number {
  const total = x.trueCount() + y.trueCount();
  if (total == 0) return 1.0;
  const common = x.andWithCountBits(y, true);
  return common / (total - common);
}

export function tanimotoDistance(x: BitArray, y: BitArray): number {
  return getDistanceFromSimilarity(tanimotoSimilarity(x, y));
}

export function diceSimilarity(x: BitArray, y: BitArray): number {
  const total = x.trueCount() + y.trueCount();
  if (total == 0) return 0.0;
  const common = x.andWithCountBits(y, true);
  return 2 * common / total;
}

export function diceDistance(x: BitArray, y: BitArray): number {
  return getDistanceFromSimilarity(diceSimilarity(x, y));
}

export function cosineSimilarity(x: BitArray, y: BitArray): number {
  const total = x.trueCount() * y.trueCount();
  if (total == 0) return 0.0;
  const common = x.andWithCountBits(y, true);
  return common / Math.sqrt(total);
}

export function cosineDistance(x: BitArray, y: BitArray): number {
  return getDistanceFromSimilarity(cosineSimilarity(x, y));
}

export function euclideanSimilarity(x: BitArray, y: BitArray): number {
  return getSimilarityFromDistance(euclideanDistance(x, y));
}

export function euclideanDistance(x: BitArray, y: BitArray): number {
  return Math.sqrt(x.trueCount() + y.trueCount() - 2 * x.andWithCountBits(y, true));
}

export function hammingSimilarity(x: BitArray, y: BitArray): number {
  return getSimilarityFromDistance(hammingDistance(x, y));
}

export function hammingDistance(x: BitArray, y: BitArray): number {
  return x.trueCount() + y.trueCount() - 2 * x.andWithCountBits(y, true);
}

export function sokalSimilarity(x: BitArray, y: BitArray): number {
  const total = x.trueCount() + y.trueCount();
  const common = x.andWithCountBits(y, true);
  return common / (2 * total - 3 * common);
}

export function sokalDistance(x: BitArray, y: BitArray): number {
  return getDistanceFromSimilarity(sokalSimilarity(x, y));
}

export function kulczynskiSimilarity(x: BitArray, y: BitArray): number {
  const total = x.trueCount() + y.trueCount();
  const totalProd = x.trueCount() * y.trueCount();
  if (totalProd == 0) return 0.0;
  const common = x.andWithCountBits(y, true);
  return (common * total) / (2 * totalProd);
}

export function kulczynskiDistance(x: BitArray, y: BitArray): number {
  return getDistanceFromSimilarity(kulczynskiSimilarity(x, y));
}

export function mcConnaugheySimilarity(x: BitArray, y: BitArray): number {
  const total = x.trueCount() + y.trueCount();
  const totalProd = x.trueCount() * y.trueCount();
  if (totalProd == 0) return 0.0;
  const common = x.andWithCountBits(y, true);
  return (common * total - totalProd) / totalProd;
}

export function mcConnaugheyDistance(x: BitArray, y: BitArray): number {
  return getDistanceFromSimilarity(mcConnaugheySimilarity(x, y));
}

export function asymmetricSimilarity(x: BitArray, y: BitArray): number {
  const min = Math.min(x.trueCount(), y.trueCount());
  if (min == 0) return 0.0;
  const common = x.andWithCountBits(y, true);
  return common / min;
}

export function asymmetricDistance(x: BitArray, y: BitArray): number {
  return getDistanceFromSimilarity(asymmetricSimilarity(x, y));
}

export function braunBlanquetSimilarity(x: BitArray, y: BitArray): number {
  const max = Math.max(x.trueCount(), y.trueCount());
  if (max == 0) return 0.0;
  const common = x.andWithCountBits(y, true);
  return common / max;
}

export function braunBlanquetDistance(x: BitArray, y: BitArray): number {
  return getDistanceFromSimilarity(braunBlanquetSimilarity(x, y));
}

export function russelSimilarity(x: BitArray, y: BitArray): number {
  if (x.length == 0) return 0.0;
  const common = x.andWithCountBits(y, true);
  return common / x.length;
}

export function russelDistance(x: BitArray, y: BitArray): number {
  return getDistanceFromSimilarity(russelSimilarity(x, y));
}

export function rogotGoldbergSimilarity(x: BitArray, y: BitArray): number {
  const common = x.andWithCountBits(y, true);
  const total = x.countBits(true) + y.countBits(true);
  const len = x.length;
  const diff = len - total + common;
  if ((common == len) || (diff == len)) return 1.0;
  else return common / total + diff / (2 * len - total);
}

export function rogotGoldbergDistance(x: BitArray, y: BitArray): number {
  return getDistanceFromSimilarity(rogotGoldbergSimilarity(x, y));
}

export function getSimilarityFromDistance(distance: number) {
  return 1 / (1 + distance);
}

export function getDistanceFromSimilarity(similarity: number) {
  return 1 / similarity - 1;
}
