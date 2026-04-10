import { createButton } from '../components/Button';
import { createScreenShell } from '../components/ScreenShell';

interface StartScreenOptions {
  onStart: () => void;
}

export function createStartScreen({ onStart }: StartScreenOptions): HTMLElement {
  const body = document.createElement('div');
  body.className = 'message-block';

  const copy = document.createElement('p');
  copy.textContent = 'A simple web-first match-3 adventure for Lapin.';
  body.append(copy);

  return createScreenShell({
    title: 'Lapin',
    body,
    actions: [
      createButton({
        label: 'Start',
        onClick: onStart
      })
    ]
  });
}

