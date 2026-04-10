import { createBoardView, type BoardAnimationState } from '../components/BoardView';
import { createButton } from '../components/Button';
import { createScreenShell } from '../components/ScreenShell';
import { PRE_GAME_MESSAGE } from '../content/story';
import {
  clearMatches,
  collapseAndRefill,
  createInitialBoard,
  findMatches,
  swapPositions
} from '../game/board';
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

const SWAP_ANIMATION_MS = 180;
const MATCH_PAUSE_MS = 240;
const CLEAR_ANIMATION_MS = 220;
const REFILL_SETTLE_MS = 160;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function createGameScreen({ onBackToTitle }: GameScreenOptions): HTMLElement {
  let board = createInitialBoard();
  let animationState: BoardAnimationState = { kind: 'idle' };
  let isAnimating = false;

  const viewState: GameViewState = {
    selectedPosition: null,
    starsCollected: 0,
    moveCount: 0,
    statusText: 'Press and drag a piece toward a neighboring tile to swap.'
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
  hint.textContent = 'Press and drag a piece toward a neighboring tile to swap.';

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
        animationState,
        interactionDisabled: isAnimating,
        onDragStart: handleDragStart,
        onSwapAttempt: handleSwapAttempt,
        onDragEnd: handleDragEnd
      })
    );
  };

  const resetBoard = () => {
    if (isAnimating) {
      return;
    }

    board = createInitialBoard();
    animationState = { kind: 'idle' };
    viewState.selectedPosition = null;
    viewState.starsCollected = 0;
    viewState.moveCount = 0;
    viewState.statusText = 'Fresh board ready. Help Lapin collect stars.';
    refresh();
  };

  const animateSwapSequence = async (start: Position, target: Position) => {
    if (isAnimating) {
      return;
    }

    isAnimating = true;
    viewState.moveCount += 1;
    viewState.selectedPosition = null;

    const originalBoard = board;
    const swappedBoard = swapPositions(board, start, target);
    const initialMatches = findMatches(swappedBoard);

    board = swappedBoard;
    animationState = {
      kind: 'swap',
      first: start,
      second: target
    };
    viewState.statusText =
      initialMatches.length > 0
        ? "Swap complete. Let's check the match."
        : 'That swap did not make a match, so it slides back.';
    refresh();
    await wait(SWAP_ANIMATION_MS);

    if (initialMatches.length === 0) {
      board = originalBoard;
      animationState = {
        kind: 'swap',
        first: target,
        second: start
      };
      refresh();
      await wait(SWAP_ANIMATION_MS);

      animationState = { kind: 'idle' };
      isAnimating = false;
      viewState.statusText = 'Press and drag a piece toward a neighboring tile to swap.';
      refresh();
      return;
    }

    let workingBoard = swappedBoard;
    let matches = initialMatches;
    let cleared = 0;
    let cascades = 0;

    while (matches.length > 0) {
      cascades += 1;
      animationState = {
        kind: 'match-pause',
        matches
      };
      viewState.statusText =
        cascades === 1
          ? 'Match found. The stars pause for a moment...'
          : `Cascade ${cascades}. Another match is ready to clear.`;
      refresh();
      await wait(MATCH_PAUSE_MS);

      animationState = {
        kind: 'clearing',
        matches
      };
      viewState.statusText =
        cascades === 1 ? 'The matched stars are clearing.' : `Cascade ${cascades} is clearing.`;
      refresh();
      await wait(CLEAR_ANIMATION_MS);

      cleared += matches.length;
      workingBoard = collapseAndRefill(clearMatches(workingBoard, matches));
      board = workingBoard;
      animationState = { kind: 'idle' };
      viewState.statusText = 'New pieces fall into place.';
      refresh();
      await wait(REFILL_SETTLE_MS);

      matches = findMatches(workingBoard);
    }

    viewState.starsCollected += cleared;
    viewState.statusText =
      cascades > 1
        ? `Nice! You collected ${cleared} stars across ${cascades} cascades.`
        : `Nice! You collected ${cleared} stars.`;
    animationState = { kind: 'idle' };
    isAnimating = false;
    refresh();
  };

  const handleSwapAttempt = (start: Position, target: Position) => {
    void animateSwapSequence(start, target);
  };

  const handleDragStart = (position: Position) => {
    if (isAnimating) {
      return;
    }

    viewState.selectedPosition = position;
    viewState.statusText = 'Great. Hold it and drag toward a neighboring tile.';
    status.textContent = viewState.statusText;
  };

  const handleDragEnd = () => {
    if (isAnimating || viewState.selectedPosition === null) {
      return;
    }

    viewState.selectedPosition = null;
    viewState.statusText = 'Press and drag a piece toward a neighboring tile to swap.';
    status.textContent = viewState.statusText;
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
