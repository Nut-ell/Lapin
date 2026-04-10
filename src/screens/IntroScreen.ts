import { createButton } from '../components/Button';
import { createScreenShell } from '../components/ScreenShell';
import { INTRO_LINES } from '../content/story';

interface IntroScreenOptions {
  onContinue: () => void;
}

export function createIntroScreen({ onContinue }: IntroScreenOptions): HTMLElement {
  const body = document.createElement('div');
  body.className = 'story-lines';

  INTRO_LINES.forEach((line, index) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    paragraph.className = 'story-line-text';
    paragraph.style.animationDelay = `${index * 1.8}s`;
    body.append(paragraph);
  });

  const storyBgm = new Audio('/assets/Turning_the_Final_Page.mp3');
  storyBgm.loop = true;
  storyBgm.volume = 0;

  let faderId: number | null = null;
  const clearFader = () => {
    if (faderId !== null) {
      window.clearInterval(faderId);
      faderId = null;
    }
  };

  const fadeIn = () => {
    clearFader();
    storyBgm.volume = 0;
    storyBgm.play().catch(() => {});
    faderId = window.setInterval(() => {
      storyBgm.volume = Math.min(storyBgm.volume + 0.015, 0.6);
      if (storyBgm.volume >= 0.6) clearFader();
    }, 50);
  };

  const fadeOutAndContinue = () => {
    clearFader();
    faderId = window.setInterval(() => {
      storyBgm.volume = Math.max(storyBgm.volume - 0.04, 0);
      if (storyBgm.volume <= 0) {
        storyBgm.pause();
        clearFader();
        onContinue();
      }
    }, 40);
  };

  const screen = createScreenShell({
    title: 'Lapin Story',
    body,
    actions: [
      createButton({
        label: 'Continue',
        onClick: fadeOutAndContinue
      })
    ]
  });

  fadeIn();
  return screen;
}

