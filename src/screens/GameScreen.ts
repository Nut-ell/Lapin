import { createBoardView, type BoardAnimationState } from '../components/BoardView';
import { createButton } from '../components/Button';
import { createScreenShell } from '../components/ScreenShell';
import { PRE_GAME_MESSAGE } from '../content/story';
import lapinCornerImage from '../assets/characters/lapin/lapin-corner-ui.png';
import { PIECE_ASSETS, PIECE_IDS, type PieceId } from '../assets/pieces';
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
  clearedByPiece: Record<PieceId, number>;
}

const SWAP_FORWARD_MS = 220;
const SWAP_RETURN_MS = 180;
const MATCH_PAUSE_MS = 620;
const CLEAR_STEP_MS = 60;
const CLEAR_ANIMATION_MS = 240;

const COMBO_LABELS: Record<number, string> = {
  2: 'Bien !',
  3: 'Très bien !',
  4: 'Magnifique !',
  5: 'Splendide !',
  6: 'Merveilleux !'
};

const COMBO_COLORS = [
  { color: '#f38aa0', glow: 'rgba(243, 138, 160, 0.55)' },
  { color: '#f3c95a', glow: 'rgba(243, 201, 90, 0.55)' },
  { color: '#91ca62', glow: 'rgba(145, 202, 98, 0.55)' },
  { color: '#58c7d4', glow: 'rgba(88, 199, 212, 0.55)' },
  { color: '#af87f6', glow: 'rgba(175, 135, 246, 0.55)' },
  { color: '#ff7eb3', glow: 'rgba(255, 126, 179, 0.6)' }
];

function showComboOverlay(cascades: number) {
  const text = cascades >= 7 ? 'Parfait !' : COMBO_LABELS[cascades];
  if (!text) return;

  const { color, glow } = COMBO_COLORS[Math.min(cascades - 2, COMBO_COLORS.length - 1)];

  const overlay = document.createElement('div');
  overlay.className = 'combo-overlay';

  const label = document.createElement('span');
  label.className = 'combo-text';
  label.textContent = text;
  label.style.setProperty('--combo-color', color);
  label.style.setProperty('--combo-glow', glow);

  overlay.append(label);
  document.body.append(overlay);

  overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
}

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
    statusText: 'Press and drag a piece toward a neighboring tile to swap.',
    clearedByPiece: Object.fromEntries(PIECE_IDS.map(id => [id, 0])) as Record<PieceId, number>
  };

  const body = document.createElement('div');
  body.className = 'game-screen';

  const layout = document.createElement('div');
  layout.className = 'game-layout';

  const mainColumn = document.createElement('div');
  mainColumn.className = 'game-main-column';

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
  boardMount.className = 'game-board-mount';

  const artRail = document.createElement('aside');
  artRail.className = 'game-art-rail';
  artRail.setAttribute('aria-hidden', 'true');

  const scoreboard = document.createElement('div');
  scoreboard.className = 'piece-scoreboard';

  const scoreItems = PIECE_ASSETS.map(piece => {
    const row = document.createElement('div');
    row.className = 'piece-score-row';

    const icon = document.createElement('img');
    icon.src = piece.imagePath;
    icon.alt = '';
    icon.className = 'piece-score-icon';

    const count = document.createElement('span');
    count.className = 'piece-score-count';
    count.textContent = '0';

    row.append(icon, count);
    scoreboard.append(row);
    return { pieceId: piece.id as PieceId, countEl: count };
  });

  const artFrame = document.createElement('div');
  artFrame.className = 'game-art-frame';

  const artImage = document.createElement('img');
  artImage.className = 'game-art-image';
  artImage.src = lapinCornerImage;
  artImage.alt = '';
  artImage.decoding = 'async';

  artFrame.append(artImage);
  artRail.append(scoreboard, artFrame);

  const refresh = () => {
    starsStat.textContent = `Stars collected: ${viewState.starsCollected}`;
    movesStat.textContent = `Moves: ${viewState.moveCount}`;
    status.textContent = viewState.statusText;

    scoreItems.forEach(({ pieceId, countEl }) => {
      countEl.textContent = String(viewState.clearedByPiece[pieceId] ?? 0);
    });

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
    PIECE_IDS.forEach(id => { viewState.clearedByPiece[id] = 0; });
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
      matchedPositions.forEach(pos => {
        const pieceId = workingBoard[pos.row][pos.col];
        viewState.clearedByPiece[pieceId] = (viewState.clearedByPiece[pieceId] ?? 0) + 1;
      });
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

    if (cascades >= 2) {
      showComboOverlay(cascades);
    }

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

  mainColumn.append(missionCard, stats, hint, status, boardMount);
  layout.append(mainColumn, artRail);
  body.append(layout);

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
  screen.classList.add('screen-card-game');

  refresh();
  return screen;
}
