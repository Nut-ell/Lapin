import { createBoardView, type BoardAnimationState } from '../components/BoardView';
import { createButton } from '../components/Button';
import { createLapinCharacter } from '../components/LapinCharacter';
import { createScreenShell } from '../components/ScreenShell';
import { PRE_GAME_MESSAGE } from '../content/story';
import { PIECE_ASSETS, PIECE_ASSET_MAP, PIECE_IDS, type PieceId } from '../assets/pieces';
import {
  clearMatches,
  collectMatchedPositions,
  collapseAndRefillWithTargets,
  createInitialBoard,
  findMatchGroups,
  swapPositions
} from '../game/board';
import type { Board, FallTarget, MatchGroup, Position } from '../game/types';

interface GameScreenOptions {
  onBackToTitle: () => void;
}

interface GameViewState {
  selectedPosition: Position | null;
  starsCollected: number;
  moveCount: number;
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

const COMBO_VOICES: Record<number, string> = {
  2: '/assets/audio/Bien.mp3',
  3: '/assets/audio/Tr%C3%A8s%20bien.mp3',
  4: '/assets/audio/Magnifique.mp3',
  5: '/assets/audio/Splendide.mp3',
  6: '/assets/audio/Merveilleux.mp3'
};

function showComboOverlay(cascades: number) {
  const text = cascades >= 7 ? 'Parfait !' : COMBO_LABELS[cascades];
  if (!text) return;

  const voiceSrc = cascades >= 7 ? COMBO_VOICES[6] : COMBO_VOICES[cascades];
  if (voiceSrc) {
    const voice = new Audio(voiceSrc);
    voice.play().catch(() => {});
  }

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

    const label = document.createElement('span');
    label.className = 'piece-score-label';
    label.textContent = `${piece.label} Shard`;

    const count = document.createElement('span');
    count.className = 'piece-score-count';
    count.textContent = '0';

    row.append(icon, label, count);
    scoreboard.append(row);
    return { pieceId: piece.id as PieceId, countEl: count, iconEl: icon };
  });

  const artFrame = document.createElement('div');
  artFrame.className = 'game-art-frame';

  const lapinCharacter = createLapinCharacter();

  artFrame.append(lapinCharacter.element);
  artRail.append(scoreboard, artFrame);

  // BGM
  const bgm = new Audio('/assets/bgm.mp3');
  bgm.loop = true;
  bgm.volume = 0;

  let faderId: number | null = null;

  const clearFader = () => {
    if (faderId !== null) {
      window.clearInterval(faderId);
      faderId = null;
    }
  };

  const fadeIn = () => {
    clearFader();
    bgm.volume = 0;
    bgm.play().catch(() => { });
    faderId = window.setInterval(() => {
      bgm.volume = Math.min(bgm.volume + 0.02, 0.7);
      if (bgm.volume >= 0.7) clearFader();
    }, 50);
  };

  const fadeOut = (onDone: () => void) => {
    clearFader();
    faderId = window.setInterval(() => {
      bgm.volume = Math.max(bgm.volume - 0.04, 0);
      if (bgm.volume <= 0) {
        bgm.pause();
        clearFader();
        onDone();
      }
    }, 40);
  };

  const refresh = () => {
    starsStat.textContent = `Stars collected: ${viewState.starsCollected}`;
    movesStat.textContent = `Moves: ${viewState.moveCount}`;
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

  const launchCollectShards = (positions: Position[], currentBoard: Board) => {
    const SHARD_SIZE = 34;
    const FLIGHT_MS = 500;

    if (positions.length > 0) {
      const rushSe = new Audio('/assets/se/lapin_glitter_stream_then_score_chime.wav');
      rushSe.play().catch(() => { });
    }

    positions.forEach((pos, index) => {
      const pieceId = currentBoard[pos.row][pos.col];
      const tile = boardMount.querySelector<HTMLButtonElement>(
        `[data-row="${pos.row}"][data-col="${pos.col}"]`
      );
      const scoreItem = scoreItems.find(item => item.pieceId === pieceId);
      if (!tile || !scoreItem) return;

      const tileRect = tile.getBoundingClientRect();
      const targetRect = scoreItem.iconEl.getBoundingClientRect();
      if (tileRect.width === 0 || targetRect.width === 0) return;

      const startX = tileRect.left + tileRect.width / 2 - SHARD_SIZE / 2;
      const startY = tileRect.top + tileRect.height / 2 - SHARD_SIZE / 2;
      const dx = (targetRect.left + targetRect.width / 2) - (tileRect.left + tileRect.width / 2);
      const dy = (targetRect.top + targetRect.height / 2) - (tileRect.top + tileRect.height / 2);

      const shard = document.createElement('img');
      shard.src = PIECE_ASSET_MAP[pieceId].imagePath;
      shard.className = 'collect-shard';
      shard.style.left = `${startX}px`;
      shard.style.top = `${startY}px`;
      shard.style.setProperty('--shard-dx', `${dx}px`);
      shard.style.setProperty('--shard-dy', `${dy}px`);
      shard.style.setProperty('--shard-delay', `${index * 32}ms`);
      shard.style.setProperty('--shard-duration', `${FLIGHT_MS}ms`);

      document.body.append(shard);

      shard.addEventListener('animationend', () => {
        shard.remove();
        viewState.clearedByPiece[pieceId] = (viewState.clearedByPiece[pieceId] ?? 0) + 1;
        scoreItem.countEl.textContent = String(viewState.clearedByPiece[pieceId]);
        scoreItem.countEl.classList.remove('count-pop');
        void scoreItem.countEl.offsetWidth;
        scoreItem.countEl.classList.add('count-pop');
      }, { once: true });
    });
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
    lapinCharacter.setSmiling(false);
    PIECE_IDS.forEach(id => { viewState.clearedByPiece[id] = 0; });
    document.querySelectorAll('.collect-shard').forEach(el => el.remove());
    refresh();
  };

  const animateSwapSequence = async (start: Position, target: Position) => {
    if (isAnimating) {
      return;
    }

    isAnimating = true;
    viewState.moveCount += 1;
    viewState.selectedPosition = null;

    const swapSe = new Audio('/assets/se/lapin_swap_dreamy_pop.wav');
    swapSe.play().catch(() => { });

    const swappedBoard = swapPositions(board, start, target);
    const initialGroups = findMatchGroups(swappedBoard);

    animationState = {
      kind: 'swap-forward',
      first: start,
      second: target
    };
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
      const matchSe = new Audio('/assets/se/lapin_one_match.wav');
      matchSe.play().catch(() => { });
      refresh();
      launchCollectShards(matchedPositions, workingBoard);
      await wait(MATCH_PAUSE_MS);

      animationState = {
        kind: 'clearing',
        groups
      };
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
      refresh();
      await wait(getRefillAnimationDuration(refillResult.fallTargets));

      animationState = { kind: 'idle' };
      groups = findMatchGroups(workingBoard);
    }

    viewState.starsCollected += cleared;
    animationState = { kind: 'idle' };
    isAnimating = false;

    if (cascades >= 2) {
      lapinCharacter.pulseSmile(2200);
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
  };

  const handleDragEnd = () => {
    if (isAnimating || viewState.selectedPosition === null) {
      return;
    }

    viewState.selectedPosition = null;
  };

  mainColumn.append(missionCard, stats, boardMount);
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
        onClick: () => {
          lapinCharacter.destroy();
          fadeOut(onBackToTitle);
        }
      })
    ]
  });
  screen.classList.add('screen-card-game');

  refresh();
  fadeIn();
  return screen;
}
