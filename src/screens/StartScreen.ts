import { createButton } from '../components/Button';
import { createScreenShell } from '../components/ScreenShell';

interface StartScreenOptions {
  onStart: () => void;
  onStory?: () => void;
}

export function createStartScreen({ onStart, onStory }: StartScreenOptions): HTMLElement {
  const body = document.createElement('div');
  body.className = 'message-block';

  const copy = document.createElement('p');
  copy.textContent = 'A simple web-first match-3 adventure for Lapin.';
  body.append(copy);

  const actions = [
    createButton({ label: 'Start', onClick: onStart })
  ];

  if (onStory) {
    actions.push(createButton({ label: 'Story', kind: 'secondary', onClick: onStory }));
  }

  return createScreenShell({
    title: 'Lapin',
    body,
    actions
  });
}

