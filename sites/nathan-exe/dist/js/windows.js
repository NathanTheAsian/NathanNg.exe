import { $ } from './dom.js';

export function focusWindow(element) {
  for (const window of [$('#manager'), $('#terminal')]) window.style.zIndex = window === element ? '5' : '4';
}

// Reusable pointer-based dragging for desktop windows.
export function makeDraggable(element, handle) {
  let drag = null;
  let offset = { x: 0, y: 0 };
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button, a, input') || element.classList.contains('maximized')) return;
    if (!element.style.transform) offset = { x: 0, y: 0 };
    drag = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('dragging');
    event.preventDefault();
  });
  handle.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const box = element.getBoundingClientRect();
    const taskbarTop = $('.taskbar').getBoundingClientRect().top;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    // Keep the title bar reachable, including on narrow screens.
    const minLeft = Math.min(0, innerWidth - box.width);
    const maxLeft = Math.max(0, innerWidth - box.width);
    const nextLeft = Math.max(minLeft, Math.min(maxLeft, box.left + dx));
    const nextTop = Math.max(0, Math.min(taskbarTop - handle.offsetHeight, box.top + dy));
    offset.x += nextLeft - box.left;
    offset.y += nextTop - box.top;
    element.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  function stop(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    handle.classList.remove('dragging');
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  }
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
  handle.addEventListener('lostpointercapture', stop);
  window.addEventListener('resize', () => {
    drag = null;
    offset = { x: 0, y: 0 };
    element.style.transform = '';
    handle.classList.remove('dragging');
  });
}

export function initWindows() {
  focusWindow($('#manager'));
  for (const element of [$('#manager'), $('#terminal')]) {
    element.addEventListener('pointerdown', () => focusWindow(element));
    element.addEventListener('focusin', () => focusWindow(element));
  }
  makeDraggable($('#manager'), $('#titlebar'));
  makeDraggable($('#terminal'), $('.terminal-title'));
}
