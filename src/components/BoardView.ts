import { PIECE_ASSET_MAP } from '../assets/pieces';
import type { Board, Position } from '../game/types';

interface BoardViewOptions {
  board: Board;
  selectedPosition: Position | null;
  onTileClick: (position: Position) => void;
}

function isSelected(current: Position, selectedPosition: Position | null) {
  return (
    selectedPosition !== null &&
    current.row === selectedPosition.row &&
    current.col === selectedPosition.col
  );
}

export function createBoardView({
  board,
  selectedPosition,
  onTileClick
}: BoardViewOptions): HTMLDivElement {
  const grid = document.createElement('div');
  grid.className = 'board-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Lapin match-3 board');

  board.forEach((row, rowIndex) => {
    row.forEach((pieceId, colIndex) => {
      const piece = PIECE_ASSET_MAP[pieceId];
      const position = {
        row: rowIndex,
        col: colIndex
      };

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'board-tile';
      button.setAttribute('role', 'gridcell');
      button.setAttribute(
        'aria-label',
        `${piece.label}, row ${rowIndex + 1}, column ${colIndex + 1}`
      );

      if (isSelected(position, selectedPosition)) {
        button.classList.add('is-selected');
      }

      const image = document.createElement('img');
      image.className = 'board-tile-image';
      image.src = piece.imagePath;
      image.alt = '';

      const hiddenLabel = document.createElement('span');
      hiddenLabel.className = 'sr-only';
      hiddenLabel.textContent = piece.label;

      button.append(image, hiddenLabel);
      button.addEventListener('click', () => onTileClick(position));
      grid.append(button);
    });
  });

  return grid;
}

