/**
 * DragManager Class
 * Enables drag-and-drop functionality for DOM elements.
 * 
 * @example
 * // Initialize the DragManager
 * const dragManager = new DragManager(
 *   (el) => console.log('Element moved:', el),
 *   (el) => console.log('Drag ended for:', el)
 * );
 * 
 * // Make an element draggable
 * const element = document.getElementById('draggable');
 * dragManager.makeDraggable(element);
 */
export class DragManager {
  /**
   * @param {Function} onMove - Callback function triggered during dragging.
   * @param {Function} onEnd - Callback function triggered when dragging ends.
   */
  constructor(onMove, onEnd) {
    this.onMove = onMove;
    this.onEnd = onEnd;
    this.active = null;

    // Bind event handlers to the instance
    this._boundEnd = this._end.bind(this);
    this._boundMove = this._move.bind(this);

    window.addEventListener('pointerup', this._boundEnd);
    window.addEventListener('pointermove', this._boundMove);
  }

  /**
   * Makes a DOM element draggable.
   * 
   * @param {HTMLElement} el - The element to make draggable.
   */
  makeDraggable(el) {
    if (!(el instanceof HTMLElement)) {
      throw new Error('Provided element is not a valid HTMLElement.');
    }
    el._didDrag = false;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el._didDrag = false;
      this.active = {
        el,
        startX: e.clientX,
        startY: e.clientY,
        origX: el.offsetLeft,
        origY: el.offsetTop,
      };
      el.setPointerCapture(e.pointerId);
    });
  
  }

  /**
   * Handles pointer move events.
   * 
   * @param {PointerEvent} e - The pointer move event.
   * @private
   */
  _move(e) {
    if (!this.active) return;

    const { el, startX, startY, origX, origY } = this.active;
    const dX = e.clientX - this.active.startX;
    const dY = e.clientY - this.active.startY;

    if (!el._didDrag && Math.abs(dX) + Math.abs(dY) > 3) {
      el._didDrag = true;
    }

    this.active.el.style.left = `${this.active.origX + dX}px`;
    this.active.el.style.top = `${this.active.origY + dY}px`;

    if (typeof this.onMove === 'function') {
      this.onMove(this.active.el);
    }
  }

  /**
   * Handles pointer up events.
   * 
   * @param {PointerEvent} e - The pointer up event.
   * @private
   */
  _end(e) {
    if (!this.active) return;

    if (typeof this.onEnd === 'function') {
      this.onEnd(this.active.el);
    }

    this.active = null;
  }

  /**
   * Cleans up event listeners to prevent memory leaks.
   */
  destroy() {
    window.removeEventListener('pointerup', this._boundEnd);
    window.removeEventListener('pointermove', this._boundMove);
  }
}

// // Example usage
// // Initialize the DragManager
// const dragManager = new DragManager(
//   (el) => console.log('Element moved:', el),
//   (el) => console.log('Drag ended for:', el)
// );

// // Make an element draggable
// const element = document.getElementById('draggable');
// dragManager.makeDraggable(element);
