import { $ } from './dom.js';
import { startup } from '../content.js';

export function initBoot(restore) {
  let timers = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function finish() {
    timers.forEach(clearTimeout);
    timers = [];
    $('#boot').classList.add('finished');
    $('#desktop').inert = false;
    try { sessionStorage.setItem('nathan-booted', '1'); } catch { /* Storage is optional. */ }
  }
  function play() {
    timers.forEach(clearTimeout);
    timers = [];
    if (reducedMotion.matches) return finish();
    $('#desktop').inert = true;
    $('#boot').className = '';
    $('#boot-lines').replaceChildren();
    startup.messages.forEach((message, index) => {
      const delay = 180 + index * Math.max(0, (startup.welcomeAtMs - 400) / Math.max(1, startup.messages.length));
      timers.push(setTimeout(() => {
        const line = document.createElement('div');
        line.className = 'boot-line' + (index ? ' ok' : '');
        line.textContent = message;
        $('#boot-lines').append(line);
      }, delay));
    });
    timers.push(setTimeout(() => $('#boot').classList.add('welcoming'), startup.welcomeAtMs));
    timers.push(setTimeout(finish, startup.finishAtMs));
  }
  $('#skip').onclick = finish;
  $('#reboot').onclick = $('#replay').onclick = () => { restore(); play(); };
  let hasBooted = false;
  try { hasBooted = sessionStorage.getItem('nathan-booted') === '1'; } catch { /* Continue without storage. */ }
  if (!startup.enabled || reducedMotion.matches || (startup.oncePerSession && hasBooted)) finish();
  else play();
}
