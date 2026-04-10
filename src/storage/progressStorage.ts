export interface ProgressState {
  introSeen: boolean;
}

const STORAGE_KEY = 'lapin:progress';

const defaultProgress: ProgressState = {
  introSeen: false
};

export function loadProgress(): ProgressState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return defaultProgress;
    }

    const parsed = JSON.parse(stored) as Partial<ProgressState>;

    return {
      introSeen: parsed.introSeen ?? false
    };
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(progress: ProgressState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

