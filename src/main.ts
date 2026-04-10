import './styles.css';
import { App } from './App';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('App root was not found.');
}

const app = new App(root);
app.mount();

