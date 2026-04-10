import aquamarine from './aquamarine.svg';
import roseQuartz from './rose_quartz.svg';
import peridot from './peridot.svg';
import citrine from './citrine.svg';
import amethyst from './amethyst.svg';

export type GemType = 0 | 1 | 2 | 3 | 4;

export const GEM_COUNT = 5;

export const GEM_NAMES = [
  'aquamarine',
  'rose_quartz',
  'peridot',
  'citrine',
  'amethyst',
] as const;

export type GemName = typeof GEM_NAMES[number];

export const GEM_SVGS: Record<GemType, string> = {
  0: aquamarine,
  1: roseQuartz,
  2: peridot,
  3: citrine,
  4: amethyst,
};

// 使用例:
// import { GEM_SVGS, GemType } from '@/assets/pieces';
// <img src={GEM_SVGS[gemType]} alt={GEM_NAMES[gemType]} />
