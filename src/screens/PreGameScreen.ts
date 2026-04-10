import { createButton } from '../components/Button';
import { createScreenShell } from '../components/ScreenShell';
import { PRE_GAME_MESSAGE } from '../content/story';

interface PreGameScreenOptions {
  onContinue: () => void;
}

export function createPreGameScreen({ onContinue }: PreGameScreenOptions): HTMLElement {
  const body = document.createElement('div');
  body.className = 'message-block';

  const message = document.createElement('p');
  message.textContent = PRE_GAME_MESSAGE;
  body.append(message);

  return createScreenShell({
    title: 'Mission',
    body,
    actions: [
      createButton({
        label: 'Start Puzzle',
        onClick: onContinue
      })
    ]
  });
}

