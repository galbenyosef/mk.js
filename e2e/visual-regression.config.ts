export const VISUAL_THRESHOLDS = {
  idle: 0.001,
  animation: 0.005,
  movement: 0.02,
} as const;

export const VISUAL_TESTS: { name: string; threshold: number; replayFile?: string; waitMs: number }[] = [
  { name: 'subzero-idle',          threshold: VISUAL_THRESHOLDS.idle,      waitMs: 3000 },
  { name: 'kano-idle',             threshold: VISUAL_THRESHOLDS.idle,      waitMs: 3000 },
  { name: 'liukang-idle',          threshold: VISUAL_THRESHOLDS.idle,      waitMs: 3000 },
  { name: 'sonya-idle',            threshold: VISUAL_THRESHOLDS.idle,      waitMs: 3000 },
  { name: 'subzero-walk-right',    threshold: VISUAL_THRESHOLDS.movement,  replayFile: 'subzero-walk-right.json', waitMs: 2500 },
  { name: 'kano-high-punch',       threshold: VISUAL_THRESHOLDS.animation, replayFile: 'kano-high-punch.json',   waitMs: 2000 },
];
