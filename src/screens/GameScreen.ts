import { createBoardView, type BoardAnimationState } from '../components/BoardView';
import { createButton } from '../components/Button';
import { createScreenShell } from '../components/ScreenShell';
import { PRE_GAME_MESSAGE } from '../content/story';
import {
  clearMatches,
  collectMatchedPositions,
  collapseAndRefillWithTargets,
  createInitialBoard,
  findMatchGroups,
  swapPositions
} from '../game/board';
import type { FallTarget, MatchGroup, Position } from '../game/types';

interface GameScreenOptions {
  onBackToTitle: () => void;
}

interface GameViewState {
  selectedPosition: Position | null;
  starsCollected: number;
  moveCount: number;
  statusText: string;
}

const SWAP_FORWARD_MS = 220;
const SWAP_RETURN_MS = 180;
const MATCH_PAUSE_MS = 620;
const CLEAR_STEP_MS = 60;
const CLEAR_ANIMATION_MS = 240;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getClearingSweepDuration(groups: MatchGroup[]) {
  const maxOffset = groups.reduce((currentMax, group) => {
    return Math.max(currentMax, (group.positions.length - 1) * CLEAR_STEP_MS);
  }, 0);

  return CLEAR_ANIMATION_MS + maxOffset;
}

function getRefillAnimationDuration(fallTargets: FallTarget[]) {
  const maxDistance = fallTargets.reduce((currentMax, target) => {
    return Math.max(currentMax, Math.min(target.dropDistance, 6));
  }, 0);

  return Math.max(240, 180 + maxDistance * 70);
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

    const swappedBoard = swapPositions(board, start, target);
    const initialGroups = findMatchGroups(swappedBoard);

    animationState = {
      kind: 'swap-forward',
      first: start,
      second: target
    };
    viewState.statusText =
      initialGroups.length > 0
        ? "Swap complete. Let's check the match."
        : 'That swap did not make a match, so it glides back.';
    refresh();
    await wait(SWAP_FORWARD_MS);

    if (initialGroups.length === 0) {
      animationState = {
        kind: 'swap-return',
        first: start,
        second: target
      };
      refresh();
      await wait(SWAP_RETURN_MS);

      animationState = { kind: 'idle' };
      isAnimating = false;
      viewState.statusText = 'Press and drag a piece toward a neighboring tile to swap.';
      refresh();
      return;
    }

    board = swappedBoard;
    let workingBoard = swappedBoard;
    let groups = initialGroups;
    let cleared = 0;
    let cascades = 0;

    while (groups.length > 0) {
      cascades += 1;
      const matchedPositions = collectMatchedPositions(groups);

      animationState = {
        kind: 'match-pause',
        groups
      };
      viewState.statusText =
        cascades === 1
          ? 'Match found. The stars pause for a moment...'
          : `Cascade ${cascades}. Another match is ready to clear.`;
      refresh();
      await wait(MATCH_PAUSE_MS);

      animationState = {
        kind: 'clearing',
        groups
      };
      viewState.statusText =
        cascades === 1 ? 'The matched stars are clearing.' : `Cascade ${cascades} is clearing.`;
      refresh();
      await wait(getClearingSweepDuration(groups));

      cleared += matchedPositions.length;
      const refillResult = collapseAndRefillWithTargets(clearMatches(workingBoard, matchedPositions));
      workingBoard = refillResult.board;
      board = workingBoard;
      animationState = {
        kind: 'refill',
        fallTargets: refillResult.fallTargets
      };
      viewState.statusText = 'New pieces fall into place.';
      refresh();
      await wait(getRefillAnimationDuration(refillResult.fallTargets));

      animationState = { kind: 'idle' };
      groups = findMatchGroups(workingBoard);
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
