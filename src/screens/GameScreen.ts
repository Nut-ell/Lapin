import { createBoardView } from '../components/BoardView';
import { createButton } from '../components/Button';
import { createScreenShell } from '../components/ScreenShell';
import { PRE_GAME_MESSAGE } from '../content/story';
import { areAdjacent, createInitialBoard, performSwap } from '../game/board';
import type { Position } from '../game/types';

interface GameScreenOptions {
  onBackToTitle: () => void;
}

interface GameViewState {
  selectedPosition: Position | null;
  starsCollected: number;
  moveCount: number;
  statusText: string;
}

function samePosition(a: Position, b: Position) {
  return a.row === b.row && a.col === b.col;
}

export function createGameScreen({ onBackToTitle }: GameScreenOptions): HTMLElement {
  let board = createInitialBoard();
  const viewState: GameViewState = {
    selectedPosition: null,
    starsCollected: 0,
    moveCount: 0,
    statusText: 'Select one tile, then an adjacent tile, to swap.'
  };

  const body = document.createElement('div');
  body.className = 'game-screen';

  const missionCard = document.createElement('div');
  missionCard.className = 'info-card';
  missionCard.textContent = PRE_GAME_MESSAGE;

  const stats = document.createElement('div');
  stats.className = 'game-stats';

  const starsStat = document.createElement('p');
  starsStat.className = 'stat-pill';

  const movesStat = document.createElement('p');
  movesStat.className = 'stat-pill';

  stats.append(starsStat, movesStat);

  const hint = document.createElement('p');
  hint.className = 'hint-text';
  hint.textContent = 'Tap a piece, then tap a neighboring piece to try a swap.';

  const status = document.createElement('p');
  status.className = 'status-text';

  const boardMount = document.createElement('div');

  const refresh = () => {
    starsStat.textContent = `Stars collected: ${viewState.starsCollected}`;
    movesStat.textContent = `Moves: ${viewState.moveCount}`;
    status.textContent = viewState.statusText;

    boardMount.replaceChildren(
      createBoardView({
        board,
        selectedPosition: viewState.selectedPosition,
        onTileClick: handleTileClick
      })
    );
  };

  const resetBoard = () => {
    board = createInitialBoard();
    viewState.selectedPosition = null;
    viewState.starsCollected = 0;
    viewState.moveCount = 0;
    viewState.statusText = 'Fresh board ready. Help Lapin collect stars.';
    refresh();
  };

  const handleTileClick = (position: Position) => {
    if (viewState.selectedPosition === null) {
      viewState.selectedPosition = position;
      viewState.statusText = 'Great. Now pick an adjacent tile to swap.';
      refresh();
      return;
    }

    if (samePosition(viewState.selectedPosition, position)) {
      viewState.selectedPosition = null;
      viewState.statusText = 'Selection cleared.';
      refresh();
      return;
    }

    if (!areAdjacent(viewState.selectedPosition, position)) {
      viewState.selectedPosition = position;
      viewState.statusText = 'That tile is now selected. Pick an adjacent one next.';
      refresh();
      return;
    }

    viewState.moveCount += 1;

    const swapResult = performSwap(board, viewState.selectedPosition, position);

    if (swapResult.validSwap) {
      board = swapResult.board;
      viewState.starsCollected += swapResult.cleared;
      viewState.statusText =
        swapResult.cascades > 1
          ? `Nice! You collected ${swapResult.cleared} stars across ${swapResult.cascades} cascades.`
          : `Nice! You collected ${swapResult.cleared} stars.`;
    } else {
      viewState.statusText = 'That swap did not make a match, so it returned to the original layout.';
    }

    viewState.selectedPosition = null;
    refresh();
  };

  body.append(missionCard, stats, hint, status, boardMount);

  const screen = createScreenShell({
    title: 'Lapin Puzzle',
    description: 'A simple 6x6 match-3 board scaffold for the first playable web version.',
    body,
    actions: [
      createButton({
        label: 'New Board',
        kind: 'secondary',
        onClick: resetBoard
      }),
      createButton({
        label: 'Back to Title',
        kind: 'secondary',
        onClick: onBackToTitle
      })
    ]
  });

  refresh();
  return screen;
}

