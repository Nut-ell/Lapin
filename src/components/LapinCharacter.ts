import neutralLapinImage from '../assets/characters/lapin/lapin-neutral-dream.png';
import smilingLapinLeftEyeOverlay from '../assets/characters/lapin/lapin-smile-eye-left-overlay.png';
import smilingLapinRightEyeOverlay from '../assets/characters/lapin/lapin-smile-eye-right-overlay.png';
import smilingLapinMouthOverlay from '../assets/characters/lapin/lapin-smile-mouth-overlay.png';

interface LapinLayerConfig {
  className: string;
  source: string;
}

export interface LapinCharacterHandle {
  element: HTMLDivElement;
  setSmiling: (smiling: boolean) => void;
  pulseSmile: (durationMs?: number) => void;
  destroy: () => void;
}

const EAR_LAYER_CONFIGS: LapinLayerConfig[] = [
  {
    className: 'lapin-character__layer lapin-character__layer--ear lapin-character__layer--ear-left',
    source: neutralLapinImage
  },
  {
    className: 'lapin-character__layer lapin-character__layer--ear lapin-character__layer--ear-right',
    source: neutralLapinImage
  }
];

const TAIL_LAYER_CONFIG: LapinLayerConfig = {
  className: 'lapin-character__layer lapin-character__layer--tail',
  source: neutralLapinImage
};

const SMILE_LAYER_CONFIGS: LapinLayerConfig[] = [
  {
    className:
      'lapin-character__feature lapin-character__feature--smile lapin-character__feature--left-eye',
    source: smilingLapinLeftEyeOverlay
  },
  {
    className:
      'lapin-character__feature lapin-character__feature--smile lapin-character__feature--right-eye',
    source: smilingLapinRightEyeOverlay
  },
  {
    className: 'lapin-character__feature lapin-character__feature--smile lapin-character__feature--mouth',
    source: smilingLapinMouthOverlay
  }
];

function createImageLayer({ className, source }: LapinLayerConfig) {
  const layer = document.createElement('div');
  layer.className = className;

  const image = document.createElement('img');
  image.className = 'lapin-character__image';
  image.src = source;
  image.alt = '';
  image.decoding = 'async';
  image.draggable = false;

  layer.append(image);
  return layer;
}

export function createLapinCharacter(): LapinCharacterHandle {
  const root = document.createElement('div');
  root.className = 'lapin-character';
  root.dataset.smiling = 'false';
  root.setAttribute('aria-hidden', 'true');

  const floatLayer = document.createElement('div');
  floatLayer.className = 'lapin-character__float';

  const breathLayer = document.createElement('div');
  breathLayer.className = 'lapin-character__breath';

  const scene = document.createElement('div');
  scene.className = 'lapin-character__scene';

  const baseLayer = createImageLayer({
    className: 'lapin-character__layer lapin-character__layer--base',
    source: neutralLapinImage
  });

  const expressionLayer = document.createElement('div');
  expressionLayer.className = 'lapin-character__expression';
  expressionLayer.append(...SMILE_LAYER_CONFIGS.map(createImageLayer));

  scene.append(
    baseLayer,
    ...EAR_LAYER_CONFIGS.map(createImageLayer),
    createImageLayer(TAIL_LAYER_CONFIG),
    expressionLayer
  );
  breathLayer.append(scene);
  floatLayer.append(breathLayer);
  root.append(floatLayer);

  let smileTimerId: number | null = null;

  const clearSmileTimer = () => {
    if (smileTimerId !== null) {
      window.clearTimeout(smileTimerId);
      smileTimerId = null;
    }
  };

  const setSmiling = (smiling: boolean) => {
    root.dataset.smiling = String(smiling);
  };

  const pulseSmile = (durationMs = 1800) => {
    clearSmileTimer();
    setSmiling(true);
    smileTimerId = window.setTimeout(() => {
      setSmiling(false);
      smileTimerId = null;
    }, durationMs);
  };

  const destroy = () => {
    clearSmileTimer();
    setSmiling(false);
  };

  return {
    element: root,
    setSmiling,
    pulseSmile,
    destroy
  };
}
