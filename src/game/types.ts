import type { PieceId } from '../assets/pieces';

export interface Position {
  row: number;
  col: number;
}

export type Board = PieceId[][];
export type BoardCell = PieceId | null;

export interface SwapResult {
  board: Board;
  validSwap: boolean;
  cleared: number;
  cascades: number;
}

