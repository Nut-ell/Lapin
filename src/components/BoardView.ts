import { PIECE_ASSET_MAP } from '../assets/pieces';
import type { Board, FallTarget, MatchDirection, MatchGroup, Position } from '../game/types';

export type BoardAnimationState =
  | { kind: 'idle' }
  | { kind: 'swap-forward'; first: Position; second: Position }
  | { kind: 'swap-return'; first: Position; second: Position }
  | { kind: 'match-pause'; groups: MatchGroup[] }
  | { kind: 'refill'; fallTargets: FallTarget[] }
  | { kind: 'clearing'; positions: Position[] };

interface BoardViewOptions {
  board: Board;
  selectedPosition: Position | null;
  animationState: BoardAnimationState;
  interactionDisabled?: boolean;
  onDragStart: (position: Position) => void;
  onSwapAttempt: (start: Position, target: Position) => void;
  onDragEnd: () => void;
}

function isSelected(current: Position, selectedPosition: Position | null) {
  return (
    selectedPosition !== null &&
    current.row === selectedPosition.row &&
    current.col === selectedPosition.col
  );
}

function samePosition(a: Position, b: Position) {
  return a.row === b.row && a.col === b.col;
}

function areAdjacent(a: Position, b: Position) {
  const rowDistance = Math.abs(a.row - b.row);
  const colDistance = Math.abs(a.col - b.col);
  return rowDistance + colDistance === 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function containsPosition(positions: Position[], target: Position) {
  return positions.some((position) => samePosition(position, target));
}

function getFallTarget(position: Position, fallTargets: FallTarget[]) {
  return fallTargets.find((fallTarget) => samePosition(fallTarget.position, position)) ?? null;
}

function getTileMatchEffects(position: Position, groups: MatchGroup[]) {
  const effects: Array<{
    direction: MatchDirection;
    index: number;
    delayMs: number;
  }> = [];

  groups.forEach((group) => {
    const index = group.positions.findIndex((entry) => samePosition(entry, position));

    if (index === -1) {
      return;
    }

    effects.push({
      direction: group.direction,
      index,
      delayMs: index * 60
    });
  });

  return effects;
}

function getGlintSpecs(
  effect: {
    direction: MatchDirection;
    index: number;
    delayMs: number;
  },
  effectIndex: number
) {
  const horizontalPatterns = [
    { x: '20%', y: '22%', size: 18, duration: 360, rotate: -12, kind: 'star' },
    { x: '76%', y: '34%', size: 10, duration: 300, rotate: 22, kind: 'dot' },
    { x: '46%', y: '18%', size: 14, duration: 340, rotate: 8, kind: 'star' },
    { x: '68%', y: '72%', size: 16, duration: 390, rotate: -18, kind: 'star' },
    { x: '28%', y: '78%', size: 8, duration: 280, rotate: 0, kind: 'dot' }
  ] as const;

  const verticalPatterns = [
    { x: '24%', y: '24%', size: 16, duration: 340, rotate: 12, kind: 'star' },
    { x: '72%', y: '76%', size: 12, duration: 320, rotate: -20, kind: 'dot' },
    { x: '24%', y: '52%', size: 14, duration: 360, rotate: -8, kind: 'star' },
    { x: '74%', y: '24%', size: 18, duration: 400, rotate: 18, kind: 'star' },
    { x: '48%', y: '78%', size: 8, duration: 280, rotate: 0, kind: 'dot' }
  ] as const;

  const patterns = effect.direction === 'horizontal' ? horizontalPatterns : verticalPatterns;
  const baseIndex = (effect.index * 2 + effectIndex) % patterns.length;
  const altIndex = (baseIndex + 2) % patterns.length;

  return [patterns[baseIndex], patterns[altIndex]].map((pattern, patternIndex) => ({
    ...pattern,
    delayMs: effect.delayMs + effectIndex * 45 + patternIndex * 60
  }));
}

function getSwapOffset(position: Position, animationState: BoardAnimationState) {
  if (animationState.kind !== 'swap-forward' && animationState.kind !== 'swap-return') {
    return null;
  }

  if (samePosition(position, animationState.first)) {
    return {
      x: animationState.second.col - animationState.first.col,
      y: animationState.second.row - animationState.first.row
    };
  }

  if (samePosition(position, animationState.second)) {
    return {
      x: animationState.first.col - animationState.second.col,
      y: animationState.first.row - animationState.second.row
    };
  }

  return null;
}

function getDragDirection(dx: number, dy: number) {
  return Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
}

function getVisualDragOffset(dx: number, dy: number, maxDistance: number) {
  const direction = getDragDirection(dx, dy);

  if (direction === 'horizontal') {
    return {
      x: clamp(dx, -maxDistance, maxDistance),
      y: 0
    };
  }

  return {
    x: 0,
    y: clamp(dy, -maxDistance, maxDistance)
  };
}

function getAdjacentPositionFromDrag(
  start: Position,
  dx: number,
  dy: number,
  boardSize: number
): Position | null {
  const direction = getDragDirection(dx, dy);

  if (direction === 'horizontal') {
    const nextCol = start.col + (dx >= 0 ? 1 : -1);

    if (nextCol < 0 || nextCol >= boardSize) {
      return null;
    }

    return {
      row: start.row,
      col: nextCol
    };
  }

  const nextRow = start.row + (dy >= 0 ? 1 : -1);

  if (nextRow < 0 || nextRow >= boardSize) {
    return null;
  }

  return {
    row: nextRow,
    col: start.col
  };
}

export function createBoardView({
  board,
  selectedPosition,
  animationState,
  interactionDisabled = false,
  onDragStart,
  onSwapAttempt,
  onDragEnd
}: BoardViewOptions): HTMLDivElement {
  const stage = document.createElement('div');
  stage.className = 'board-stage';

  const grid = document.createElement('div');
  grid.className = 'board-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Lapin match-3 board');

  if (interactionDisabled) {
    grid.classList.add('is-locked');
  }

  let activeDrag:
    | {
        pointerId: number;
        startPosition: Position;
        startClientX: number;
        startClientY: number;
        tile: HTMLButtonElement;
        previewTile: HTMLButtonElement | null;
        hasSwapped: boolean;
      }
    | null = null;

  const cleanupDrag = () => {
    if (activeDrag) {
      activeDrag.tile.classList.remove('is-selected');
      activeDrag.tile.classList.remove('is-grabbed');
      activeDrag.tile.style.removeProperty('--drag-x');
      activeDrag.tile.style.removeProperty('--drag-y');

      if (activeDrag.previewTile) {
        activeDrag.previewTile.classList.remove('is-preview-target');
        activeDrag.previewTile.style.removeProperty('--preview-x');
        activeDrag.previewTile.style.removeProperty('--preview-y');
      }
    }

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
    activeDrag = null;
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId || activeDrag.hasSwapped) {
      return;
    }

    const rawDx = event.clientX - activeDrag.startClientX;
    const rawDy = event.clientY - activeDrag.startClientY;
    const tileWidth = activeDrag.tile.getBoundingClientRect().width;
    const maxDistance = tileWidth * 0.48;
    const swapThreshold = tileWidth * 0.34;
    const visualOffset = getVisualDragOffset(rawDx, rawDy, maxDistance);

    activeDrag.tile.style.setProperty('--drag-x', `${visualOffset.x}px`);
    activeDrag.tile.style.setProperty('--drag-y', `${visualOffset.y}px`);

    if (activeDrag.previewTile) {
      activeDrag.previewTile.classList.remove('is-preview-target');
      activeDrag.previewTile.style.removeProperty('--preview-x');
      activeDrag.previewTile.style.removeProperty('--preview-y');
      activeDrag.previewTile = null;
    }

    const previewPosition = getAdjacentPositionFromDrag(
      activeDrag.startPosition,
      rawDx,
      rawDy,
      board.length
    );

    if (previewPosition && areAdjacent(activeDrag.startPosition, previewPosition)) {
      const previewTile = grid.querySelector<HTMLButtonElement>(
        `[data-row="${previewPosition.row}"][data-col="${previewPosition.col}"]`
      );

      if (previewTile) {
        previewTile.classList.add('is-preview-target');
        previewTile.style.setProperty('--preview-x', `${visualOffset.x * -0.18}px`);
        previewTile.style.setProperty('--preview-y', `${visualOffset.y * -0.18}px`);
        activeDrag.previewTile = previewTile;
      }
    }

    const dragDistance = Math.max(Math.abs(visualOffset.x), Math.abs(visualOffset.y));

    if (!previewPosition || dragDistance < swapThreshold) {
      return;
    }

    const startPosition = activeDrag.startPosition;
    activeDrag.hasSwapped = true;
    cleanupDrag();
    onSwapAttempt(startPosition, previewPosition);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
      return;
    }

    const wasSwapped = activeDrag.hasSwapped;
    cleanupDrag();

    if (!wasSwapped) {
      onDragEnd();
    }
  };

  const handlePointerCancel = (event: PointerEvent) => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
      return;
    }

    cleanupDrag();
    onDragEnd();
  };

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
      button.dataset.row = String(rowIndex);
      button.dataset.col = String(colIndex);
      button.setAttribute(
        'aria-label',
        `${piece.label}, row ${rowIndex + 1}, column ${colIndex + 1}`
      );

      if (isSelected(position, selectedPosition)) {
        button.classList.add('is-selected');
      }

      const swapOffset = getSwapOffset(position, animationState);

      if (swapOffset) {
        button.classList.add(
          animationState.kind === 'swap-forward' ? 'is-swapping-forward' : 'is-swapping-return'
        );
        button.style.setProperty('--swap-x', `${swapOffset.x}`);
        button.style.setProperty('--swap-y', `${swapOffset.y}`);
      }

      const matchEffects =
        animationState.kind === 'match-pause'
          ? getTileMatchEffects(position, animationState.groups)
          : [];

      if (matchEffects.length > 0) {
        button.classList.add('is-match-ready');
      }

      const fallTarget =
        animationState.kind === 'refill' ? getFallTarget(position, animationState.fallTargets) : null;

      if (fallTarget) {
        const normalizedDistance = Math.min(fallTarget.dropDistance, 5);
        button.classList.add('is-refilling');
        button.style.setProperty('--fall-lift', `${normalizedDistance * 6}px`);
        button.style.setProperty('--fall-delay', `${normalizedDistance * 18}ms`);
      }

      if (animationState.kind === 'clearing' && containsPosition(animationState.positions, position)) {
        button.classList.add('is-clearing');
      }

      const image = document.createElement('img');
      image.className = 'board-tile-image';
      image.src = piece.imagePath;
      image.alt = '';

      const hiddenLabel = document.createElement('span');
      hiddenLabel.className = 'sr-only';
      hiddenLabel.textContent = piece.label;

      const sparkleLayer = document.createElement('span');
      sparkleLayer.className = 'tile-effect-layer';

      matchEffects.forEach((effect, effectIndex) => {
        const shimmer = document.createElement('span');
        shimmer.className = `tile-shimmer tile-shimmer-${effect.direction}`;
        shimmer.style.setProperty('--shimmer-delay', `${effect.delayMs}ms`);
        sparkleLayer.append(shimmer);

        getGlintSpecs(effect, effectIndex).forEach((glint) => {
          const sparkle = document.createElement('span');
          sparkle.className = `match-glint match-glint-${glint.kind}`;
          sparkle.style.setProperty('--glint-x', glint.x);
          sparkle.style.setProperty('--glint-y', glint.y);
          sparkle.style.setProperty('--glint-size', `${glint.size}px`);
          sparkle.style.setProperty('--glint-delay', `${glint.delayMs}ms`);
          sparkle.style.setProperty('--glint-duration', `${glint.duration}ms`);
          sparkle.style.setProperty('--glint-rotate', `${glint.rotate}deg`);
          sparkleLayer.append(sparkle);
        });
      });

      button.append(image, hiddenLabel, sparkleLayer);
      button.addEventListener('pointerdown', (event) => {
        if (interactionDisabled) {
          return;
        }

        event.preventDefault();
        cleanupDrag();

        activeDrag = {
          pointerId: event.pointerId,
          startPosition: position,
          startClientX: event.clientX,
          startClientY: event.clientY,
          tile: button,
          previewTile: null,
          hasSwapped: false
        };

        button.classList.add('is-selected');
        button.classList.add('is-grabbed');
        onDragStart(position);

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerCancel);
      });
      grid.append(button);
    });
  });

  stage.append(grid);
  return stage;
}
