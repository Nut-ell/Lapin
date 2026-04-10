interface ScreenShellOptions {
  title: string;
  description?: string;
  body?: HTMLElement;
  actions?: HTMLElement[];
}

export function createScreenShell({
  title,
  description,
  body,
  actions = []
}: ScreenShellOptions): HTMLElement {
  const card = document.createElement('section');
  card.className = 'screen-card';

  const header = document.createElement('header');
  header.className = 'screen-header';

  const heading = document.createElement('h1');
  heading.className = 'screen-title';
  heading.textContent = title;

  header.append(heading);

  if (description) {
    const copy = document.createElement('p');
    copy.className = 'screen-description';
    copy.textContent = description;
    header.append(copy);
  }

  card.append(header);

  if (body) {
    body.classList.add('screen-body');
    card.append(body);
  }

  if (actions.length > 0) {
    const actionRow = document.createElement('div');
    actionRow.className = 'screen-actions';
    actionRow.append(...actions);
    card.append(actionRow);
  }

  return card;
}

