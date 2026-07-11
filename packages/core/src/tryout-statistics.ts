export type FrequencyBin = {
  index: number;
  label: string;
  lower: number;
  upper: number;
  frequency: number;
  percentage: number;
};

export type TryoutStatistics = {
  count: number;
  mean: number;
  median: number;
  modes: number[];
  minimum: number;
  maximum: number;
  variance: number;
  standardDeviation: number;
  q1: number;
  q2: number;
  q3: number;
  skewness: number;
  skewnessLabel: string;
  kurtosisExcess: number;
  kurtosisLabel: string;
  bins: FrequencyBin[];
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function quantile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function skewnessDescription(value: number) {
  if (value <= -1) return 'Miring kuat ke kiri (skewness negatif). Nilai tinggi lebih dominan, dengan ekor distribusi memanjang ke skor rendah.';
  if (value < -0.5) return 'Miring sedang ke kiri (skewness negatif). Distribusi cenderung terkonsentrasi pada skor yang relatif tinggi.';
  if (value <= 0.5) return 'Relatif simetris. Sebaran skor di sisi kiri dan kanan pusat data cukup seimbang.';
  if (value < 1) return 'Miring sedang ke kanan (skewness positif). Distribusi cenderung terkonsentrasi pada skor yang relatif rendah.';
  return 'Miring kuat ke kanan (skewness positif). Nilai rendah lebih dominan, dengan ekor distribusi memanjang ke skor tinggi.';
}

function kurtosisDescription(excess: number) {
  if (excess > 0.5) return 'Leptokurtik. Puncak distribusi lebih runcing dan peluang nilai ekstrem relatif lebih besar dibanding distribusi normal.';
  if (excess < -0.5) return 'Platikurtik. Puncak distribusi lebih datar dan skor cenderung lebih menyebar dibanding distribusi normal.';
  return 'Mendekati mesokurtik. Tingkat keruncingan distribusi relatif serupa dengan distribusi normal.';
}

function buildBins(scores: number[]): FrequencyBin[] {
  const bins = Array.from({ length: 10 }, (_, index) => ({
    index,
    label: index === 9 ? '90–100' : `${index * 10}–<${(index + 1) * 10}`,
    lower: index * 10,
    upper: index === 9 ? 100 : (index + 1) * 10,
    frequency: 0,
    percentage: 0,
  }));

  for (const raw of scores) {
    const score = Math.max(0, Math.min(100, raw));
    const index = score >= 100 ? 9 : Math.floor(score / 10);
    bins[index].frequency += 1;
  }

  return bins.map((bin) => ({
    ...bin,
    percentage: scores.length ? round((bin.frequency / scores.length) * 100) : 0,
  }));
}

export function calculateTryoutStatistics(input: number[]): TryoutStatistics {
  const scores = input.filter(Number.isFinite).map((value) => Math.max(0, Math.min(100, Number(value)))).sort((a, b) => a - b);
  const count = scores.length;
  if (!count) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      modes: [],
      minimum: 0,
      maximum: 0,
      variance: 0,
      standardDeviation: 0,
      q1: 0,
      q2: 0,
      q3: 0,
      skewness: 0,
      skewnessLabel: 'Belum ada data skor yang dapat dianalisis.',
      kurtosisExcess: 0,
      kurtosisLabel: 'Belum ada data skor yang dapat dianalisis.',
      bins: buildBins([]),
    };
  }

  const mean = scores.reduce((sum, value) => sum + value, 0) / count;
  const centered = scores.map((value) => value - mean);
  const variance = centered.reduce((sum, value) => sum + value ** 2, 0) / count;
  const standardDeviation = Math.sqrt(variance);
  const thirdMoment = centered.reduce((sum, value) => sum + value ** 3, 0) / count;
  const fourthMoment = centered.reduce((sum, value) => sum + value ** 4, 0) / count;
  const skewness = standardDeviation > 0 ? thirdMoment / standardDeviation ** 3 : 0;
  const kurtosisExcess = variance > 0 ? fourthMoment / variance ** 2 - 3 : 0;

  const frequencies = new Map<number, number>();
  for (const value of scores) {
    const key = round(value, 2);
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
  }
  const highestFrequency = Math.max(...frequencies.values());
  const modes = highestFrequency > 1
    ? [...frequencies.entries()].filter(([, frequency]) => frequency === highestFrequency).map(([value]) => value).sort((a, b) => a - b)
    : [];

  const q1 = quantile(scores, 0.25);
  const q2 = quantile(scores, 0.5);
  const q3 = quantile(scores, 0.75);

  return {
    count,
    mean: round(mean),
    median: round(q2),
    modes,
    minimum: round(scores[0]),
    maximum: round(scores[count - 1]),
    variance: round(variance),
    standardDeviation: round(standardDeviation),
    q1: round(q1),
    q2: round(q2),
    q3: round(q3),
    skewness: round(skewness, 3),
    skewnessLabel: count < 3 ? 'Jumlah observasi belum cukup untuk menafsirkan kemiringan secara stabil.' : skewnessDescription(skewness),
    kurtosisExcess: round(kurtosisExcess, 3),
    kurtosisLabel: count < 4 ? 'Jumlah observasi belum cukup untuk menafsirkan keruncingan secara stabil.' : kurtosisDescription(kurtosisExcess),
    bins: buildBins(scores),
  };
}
