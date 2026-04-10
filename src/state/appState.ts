import type { ProgressState } from '../storage/progressStorage';

export type AppScreen = 'start' | 'intro' | 'pregame' | 'game';

export interface AppState {
  currentScreen: AppScreen;
  progress: ProgressState;
}

export function createAppState(progress: ProgressState): AppState {
  return {
    currentScreen: 'start',
    progress
  };
}

export function getStartFlowScreen(progress: ProgressState): AppScreen {
  return progress.introSeen ? 'pregame' : 'intro';
}

