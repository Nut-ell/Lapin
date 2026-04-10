import { PIECE_IDS, type PieceId } from '../assets/pieces';
import { BOARD_SIZE, MIN_MATCH_LENGTH } from './constants';
import type { Board, BoardCell, FallTarget, MatchGroup, Position, SwapResult } from './types';

function randomPieceId(excluded: PieceId[] = []): PieceId {
  const availablePieces = PIECE_IDS.filter((pieceId) => !excluded.includes(pieceId));
  const randomIndex = Math.floor(Math.random() * availablePieces.length);
  return availablePieces[randomIndex];
}

function cloneBoard(board: Board | BoardCell[][]): BoardCell[][] {
  return board.map((row) => [...row]);
}

function positionKey(position: Position) {
  return `${position.row}:${position.col}`;
}

export function areAdjacent(a: Position, b: Position) {
  const rowDistance = Math.abs(a.row - b.row);
  const colDistance = Math.abs(a.col - b.col);
  return rowDistance + colDistance === 1;
}

export function createInitialBoard(size = BOARD_SIZE): Board {
  const board: BoardCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const excluded: PieceId[] = [];

      if (col >= 2 && board[row][col - 1] === board[row][col - 2] && board[row][col - 1] !== null) {
        excluded.push(board[row][col - 1]);
      }

      if (row >= 2 && board[row - 1][col] === board[row - 2][col] && board[row - 1][col] !== null) {
        excluded.push(board[row - 1][col]);
      }

      board[row][col] = randomPieceId(excluded);
    }
  }

  return board as Board;
}

export function swapPositions(board: Board, first: Position, second: Position): Board {
  const nextBoard = cloneBoard(board) as Board;
  const firstValue = nextBoard[first.row][first.col];
  nextBoard[first.row][first.col] = nextBoard[second.row][second.col];
  nextBoard[second.row][second.col] = firstValue;
  return nextBoard;
}

export function findMatchGroups(board: Board | BoardCell[][]): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const size = board.length;

  for (let row = 0; row < size; row += 1) {
    let runStart = 0;

    for (let col = 1; col <= size; col += 1) {
      const current = col < size ? board[row][col] : null;
      const previous = board[row][col - 1];

      if (current !== previous) {
        const runLength = col - runStart;

        if (previous !== null && runLength >= MIN_MATCH_LENGTH) {
          const positions: Position[] = [];

          for (let matchCol = runStart; matchCol < col; matchCol += 1) {
            positions.push({ row, col: matchCol });
          }

          groups.push({
            direction: 'horizontal',
            positions
          });
        }

        runStart = col;
      }
    }
  }

  for (let col = 0; col < size; col += 1) {
    let runStart = 0;

    for (let row = 1; row <= size; row += 1) {
      const current = row < size ? board[row][col] : null;
      const previous = board[row - 1][col];

      if (current !== previous) {
        const runLength = row - runStart;

        if (previous !== null && runLength >= MIN_MATCH_LENGTH) {
          const positions: Position[] = [];

          for (let matchRow = runStart; matchRow < row; matchRow += 1) {
            positions.push({ row: matchRow, col });
          }

          groups.push({
            direction: 'vertical',
            positions
          });
        }

        runStart = row;
      }
    }
  }

  return groups;
}

export function collectMatchedPositions(groups: MatchGroup[]): Position[] {
  const matched = new Map<string, Position>();

  groups.forEach((group) => {
    group.positions.forEach((position) => {
      matched.set(positionKey(position), position);
    });
  });

  return Array.from(matched.values());
}

export function findMatches(board: Board | BoardCell[][]): Position[] {
  return collectMatchedPositions(findMatchGroups(board));
}

function collapseColumns(board: BoardCell[][]) {
  const size = board.length;

  for (let col = 0; col < size; col += 1) {
    let targetRow = size - 1;

    for (let row = size - 1; row >= 0; row -= 1) {
      const cell = board[row][col];

      if (cell !== null) {
        board[targetRow][col] = cell;

        if (targetRow !== row) {
          board[row][col] = null;
        }

        targetRow -= 1;
      }
    }

    for (let row = targetRow; row >= 0; row -= 1) {
      board[row][col] = randomPieceId();
    }
  }
}

export function collapseAndRefillWithTargets(board: BoardCell[][]): {
  board: Board;
  fallTargets: FallTarget[];
} {
  const nextBoard = cloneBoard(board);
  const fallTargets: FallTarget[] = [];
  const size = nextBoard.length;

  for (let col = 0; col < size; col += 1) {
    let targetRow = size - 1;

    for (let row = size - 1; row >= 0; row -= 1) {
      const cell = nextBoard[row][col];

      if (cell === null) {
        continue;
      }

      nextBoard[targetRow][col] = cell;

      if (targetRow !== row) {
        nextBoard[row][col] = null;
        fallTargets.push({
          position: { row: targetRow, col },
          dropDistance: targetRow - row
        });
      }

      targetRow -= 1;
    }

    for (let row = targetRow; row >= 0; row -= 1) {
      nextBoard[row][col] = randomPieceId();
      fallTargets.push({
        position: { row, col },
        dropDistance: row + 1
      });
    }
  }

  return {
    board: nextBoard as Board,
    fallTargets
  };
}

export function clearMatches(board: Board, matches: Position[]): BoardCell[][] {
  const nextBoard = cloneBoard(board);

  matches.forEach(({ row, col }) => {
    nextBoard[row][col] = null;
  });

  return nextBoard;
}

export function collapseAndRefill(board: BoardCell[][]): Board {
  return collapseAndRefillWithTargets(board).board;
}

export function resolveBoard(board: Board): {
  board: Board;
  cleared: number;
  cascades: number;
} {
  const nextBoard = cloneBoard(board);
  let cleared = 0;
  let cascades = 0;

  while (true) {
    const matches = findMatches(nextBoard);

    if (matches.length === 0) {
      break;
    }

    cascades += 1;
    cleared += matches.length;

    matches.forEach(({ row, col }) => {
      nextBoard[row][col] = null;
    });

    collapseColumns(nextBoard);
  }

  return {
    board: nextBoard as Board,
    cleared,
    cascades
  };
}

export function performSwap(board: Board, first: Position, second: Position): SwapResult {
  if (!areAdjacent(first, second)) {
    return {
      board,
      validSwap: false,
      cleared: 0,
      cascades: 0
    };
  }

  const swappedBoard = swapPositions(board, first, second);
  const matches = findMatches(swappedBoard);

  if (matches.length === 0) {
    return {
      board,
      validSwap: false,
      cleared: 0,
      cascades: 0
    };
  }

  const resolved = resolveBoard(swappedBoard);

  return {
    board: resolved.board,
    validSwap: true,
    cleared: resolved.cleared,
    cascades: resolved.cascades
  };
}
