import { createButton } from '../components/Button';
import { createScreenShell } from '../components/ScreenShell';
import { INTRO_LINES } from '../content/story';

interface IntroScreenOptions {
  onContinue: () => void;
}

export function createIntroScreen({ onContinue }: IntroScreenOptions): HTMLElement {
  const body = document.createElement('div');
  body.className = 'story-lines';

  INTRO_LINES.forEach((line) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    body.append(paragraph);
  });

  return createScreenShell({
    title: 'Lapin Story',
    description: 'First launch only',
    body,
    actions: [
      createButton({
        label: 'Continue',
        onClick: onContinue
      })
    ]
  });
}

