// Keyboard + mouse state, in field coordinates. The canvas is scaled to the window,
// so mouse pixels are mapped back into the 1280x720 logical field.
import { VIEW } from './config.js';

export function makeInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouseX: VIEW.width / 2,
    mouseY: VIEW.height / 2 - 120,
    mouseDown: false,
    // Edge-triggered actions, consumed by the game loop each step.
    clicked: false,
    clickX: 0,
    clickY: 0,
    dashPressed: false,
    pausePressed: false,
    mutePressed: false,
    restartPressed: false,
    numberPressed: 0, // 1..3 for upgrade cards, 0 = none
    anyKey: false,
  };

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW.width,
      y: ((clientY - rect.top) / rect.height) * VIEW.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    input.anyKey = true;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'Space') {
      input.dashPressed = true;
      event.preventDefault();
    }
    if (event.code === 'KeyP' || event.code === 'Escape') input.pausePressed = true;
    if (event.code === 'KeyM') input.mutePressed = true;
    if (event.code === 'KeyR' || event.code === 'Enter') input.restartPressed = true;
    if (event.code === 'Digit1') input.numberPressed = 1;
    if (event.code === 'Digit2') input.numberPressed = 2;
    if (event.code === 'Digit3') input.numberPressed = 3;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const p = toField(event.clientX, event.clientY);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = toField(event.clientX, event.clientY);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseDown = true;
    input.clicked = true;
    input.clickX = p.x;
    input.clickY = p.y;
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  input.consumeEdges = function consumeEdges() {
    const edges = {
      clicked: input.clicked, clickX: input.clickX, clickY: input.clickY,
      dashPressed: input.dashPressed, pausePressed: input.pausePressed,
      mutePressed: input.mutePressed, restartPressed: input.restartPressed,
      numberPressed: input.numberPressed, anyKey: input.anyKey,
    };
    input.clicked = false;
    input.dashPressed = false;
    input.pausePressed = false;
    input.mutePressed = false;
    input.restartPressed = false;
    input.numberPressed = 0;
    input.anyKey = false;
    return edges;
  };

  input.moveVector = function moveVector() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  };

  return input;
}
