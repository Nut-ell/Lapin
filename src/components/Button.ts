type ButtonKind = 'primary' | 'secondary';

interface ButtonOptions {
  label: string;
  kind?: ButtonKind;
  onClick: () => void;
}

export function createButton({
  label,
  kind = 'primary',
  onClick
}: ButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button button-${kind}`;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

