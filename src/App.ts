import { createGameScreen } from './screens/GameScreen';
import { createIntroScreen } from './screens/IntroScreen';
import { createPreGameScreen } from './screens/PreGameScreen';
import { createStartScreen } from './screens/StartScreen';
import { loadProgress, saveProgress, type ProgressState } from './storage/progressStorage';
import {
  createAppState,
  getStartFlowScreen,
  type AppScreen,
  type AppState
} from './state/appState';

export class App {
  private readonly root: HTMLDivElement;
  private state: AppState;

  constructor(root: HTMLDivElement) {
    this.root = root;
    this.state = createAppState(loadProgress());
  }

  mount() {
    this.root.className = 'app-shell';
    this.render();
  }

  private setScreen(screen: AppScreen) {
    this.state = {
      ...this.state,
      currentScreen: screen
    };
    this.render();
  }

  private updateProgress(progress: ProgressState) {
    this.state = {
      ...this.state,
      progress
    };
    saveProgress(progress);
  }

  private handleStart = () => {
    this.setScreen(getStartFlowScreen(this.state.progress));
  };

  private handleIntroContinue = () => {
    const nextProgress: ProgressState = {
      ...this.state.progress,
      introSeen: true
    };

    this.updateProgress(nextProgress);
    this.setScreen('pregame');
  };

  private handlePreGameContinue = () => {
    this.setScreen('game');
  };

  private handleBackToTitle = () => {
    this.setScreen('start');
  };

  private render() {
    const screen = this.createScreen();
    this.root.replaceChildren(screen);
  }

  private createScreen() {
    switch (this.state.currentScreen) {
      case 'intro':
        return createIntroScreen({
          onContinue: this.handleIntroContinue
        });
      case 'pregame':
        return createPreGameScreen({
          onContinue: this.handlePreGameContinue
        });
      case 'game':
        return createGameScreen({
          onBackToTitle: this.handleBackToTitle
        });
      case 'start':
      default:
        return createStartScreen({
          onStart: this.handleStart
        });
    }
  }
}

