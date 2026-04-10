import amethyst from './pieces/amethyst.svg';
import aquamarine from './pieces/aquamarine.svg';
import citrine from './pieces/citrine.svg';
import peridot from './pieces/peridot.svg';
import roseQuartz from './pieces/rose_quartz.svg';

export const PIECE_ASSETS = [
  {
    id: 'aquamarine',
    label: 'Aquamarine',
    imagePath: aquamarine,
    accentColor: '#58c7d4'
  },
  {
    id: 'rose_quartz',
    label: 'Rose Quartz',
    imagePath: roseQuartz,
    accentColor: '#f1a7bf'
  },
  {
    id: 'peridot',
    label: 'Peridot',
    imagePath: peridot,
    accentColor: '#91ca62'
  },
  {
    id: 'citrine',
    label: 'Citrine',
    imagePath: citrine,
    accentColor: '#f3c95a'
  },
  {
    id: 'amethyst',
    label: 'Amethyst',
    imagePath: amethyst,
    accentColor: '#af87f6'
  }
] as const;

export type PieceId = (typeof PIECE_ASSETS)[number]['id'];

export const PIECE_IDS = PIECE_ASSETS.map((piece) => piece.id) as PieceId[];

export const PIECE_ASSET_MAP: Record<PieceId, (typeof PIECE_ASSETS)[number]> = Object.fromEntries(
  PIECE_ASSETS.map((piece) => [piece.id, piece])
) as Record<PieceId, (typeof PIECE_ASSETS)[number]>;
