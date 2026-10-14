import { $ } from './dom.js';
import { site } from '../content.js';
import { initTaskManager } from './task-manager.js';
import { initWindows } from './windows.js?v=2';
import { initTerminal } from './terminal.js';
import { initBoot } from './boot.js';

document.title = site.name + ' — Personal Task Manager';
$('.welcome h1').textContent = site.name;
$('.desktop-caption h1').textContent = site.desktopTitle;
$('.desktop-caption p').textContent = site.desktopDescription;
$('.taskbar-name').textContent = site.name;
$('#titlebar > span').lastChild.textContent = ' ' + site.name + ' — Task Manager';

const restore = initTaskManager();
initWindows();
initTerminal();
initBoot(restore);
function tick() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '\n' + now.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
tick();
setInterval(tick, 30000);
