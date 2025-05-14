/**
 * CanvasDrawer Class
 * Handles drawing connections and arrows on a canvas element, dynamically updating based on viewport size and scroll events.
 * 
 * @example
 * // Initialize the CanvasDrawer with a configuration object
 * const config = {
 *   connections: [
 *     { from: 'node1', to: 'node2', type: 'dashed' },
 *   ],
 *   connectionTypes: {
 *     dashed: { class: 'dashed-arrow', dash: [5, 5], head: 'end' },
 *   },
 * };
 * const canvasDrawer = new CanvasDrawer(config);
 */
export class CanvasDrawer {
  /**
   * @param {Object} config - Configuration object for connections and connection types.
   */
  constructor(config) {
    this.config = config;
    this.canvas = document.getElementById('connections');
    if (!this.canvas) {
      throw new Error('Canvas element with ID "connections" not found.');
    }
    this.ctx = this.canvas.getContext('2d');

    window.addEventListener('resize', () => this._resize());
    window.addEventListener('scroll', () => this.drawAll());
    this._resize();
  }

  /**
   * Resizes the canvas to match the viewport size and redraws all connections.
   * @private
   */
  _resize() {
    this.canvas.width = document.documentElement.clientWidth;
    this.canvas.height = document.documentElement.clientHeight;
    this.drawAll();
  }

  /**
   * Draws all connections defined in the configuration.
   */
  drawAll() {
    const { ctx, canvas, config } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const conns = Array.isArray(config.connections) ? config.connections : [];
    const types = config.connectionTypes || {};

    conns.forEach((conn) => {
      const fromEl = document.querySelector(`.node[data-id="${conn.from}"]`);
      const toEl = document.querySelector(`.node[data-id="${conn.to}"]`);
      if (!fromEl || !toEl) return;

      const cfg = types[conn.type] || {};
      this._drawArrow(fromEl, toEl, {
        className: cfg.class,
        dash: cfg.dash,
        head: cfg.head,
      });
    });
  }

  /**
   * Draws an arrow between two elements.
   * @param {HTMLElement} a - The starting element.
   * @param {HTMLElement} b - The ending element.
   * @param {Object} options - Options for the arrow style.
   * @private
   */
  _drawArrow(
    a,
    b,
    {
      className = 'arrow',
      dash = [],
      start = 'boundary',
      end = 'boundary',
      arrowhead = 'filled',
      head = 'end',
    } = {}
  ) {
    const { ctx } = this;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();

    const c1x = ra.left + ra.width / 2 + window.scrollX;
    const c1y = ra.top + ra.height / 2 + window.scrollY;
    const c2x = rb.left + rb.width / 2 + window.scrollX;
    const c2y = rb.top + rb.height / 2 + window.scrollY;

    const [startX, startY] = start === 'boundary'
      ? this._intersectRect(ra, c1x, c1y, c2x, c2y)
      : [c1x, c1y];

    const [endX, endY] = end === 'boundary'
      ? this._intersectRect(rb, c2x, c2y, c1x, c1y)
      : [c2x, c2y];

    const { cp1x, cp1y, cp2x, cp2y } = this._calculateBezierControlPoints(startX, startY, endX, endY);

    const color = this._getStrokeColor(className);

    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();

    const angleStart = Math.atan2(cp1y - startY, cp1x - startX);
    const angleEnd = Math.atan2(endY - cp2y, endX - cp2x);

    if (head === 'end' || head === 'both') {
      this._drawArrowhead(endX, endY, angleEnd, arrowhead);
    }
    if (head === 'start' || head === 'both') {
      this._drawArrowhead(startX, startY, angleStart + Math.PI, arrowhead);
    }
  }

  /**
   * Calculates Bézier control points for a curve.
   * @private
   */
  _calculateBezierControlPoints(startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.hypot(dx, dy);
    const strength = Math.min(80, dist / 12);
    const norm = Math.hypot(dx, dy);
    const px = -dy / norm;
    const py = dx / norm;

    return {
      cp1x: startX + dx / 3 + px * strength,
      cp1y: startY + dy / 3 + py * strength,
      cp2x: startX + 2 * dx / 3 - px * strength,
      cp2y: startY + 2 * dy / 3 - py * strength,
    };
  }

  /**
   * Gets the stroke color for the arrow.
   * @private
   */
  _getStrokeColor(className) {
    const dummy = document.createElement('div');
    dummy.className = `arrow-color ${className}`;
    document.body.appendChild(dummy);
    const color = getComputedStyle(dummy).getPropertyValue('color') || 'cyan';
    dummy.remove();
    return color;
  }

  /**
   * Draws an arrowhead at the specified position.
   * @private
   */
  _drawArrowhead(x, y, angle, style) {
    const sz = 10;
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    switch (style) {
      case 'filled':
        ctx.moveTo(0, 0);
        ctx.lineTo(-sz, sz / 2);
        ctx.lineTo(-sz, -sz / 2);
        ctx.closePath();
        ctx.fill();
        break;
      case 'open':
        ctx.moveTo(-sz, sz / 2);
        ctx.lineTo(0, 0);
        ctx.lineTo(-sz, -sz / 2);
        ctx.stroke();
        break;
      case 'diamond':
        ctx.moveTo(0, 0);
        ctx.lineTo(-sz / 2, sz / 2);
        ctx.lineTo(-sz, 0);
        ctx.lineTo(-sz / 2, -sz / 2);
        ctx.closePath();
        ctx.fill();
        break;
      case 'circle':
        ctx.arc(-sz / 2, 0, sz / 2, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case 'none':
      default:
        break;
    }
    ctx.restore();
  }

  /**
   * Calculates the intersection of a line with a rectangle boundary.
   * @private
   */
  _intersectRect(rect, cx, cy, tx, ty) {
    const dx = tx - cx;
    const dy = ty - cy;
    const w = rect.width / 2;
    const h = rect.height / 2;
    const absDX = Math.abs(dx);
    const absDY = Math.abs(dy);
    const scale = absDX / w > absDY / h ? w / absDX : h / absDY;
    return [cx + dx * scale, cy + dy * scale];
  }
}

// // Example usage
// const config = {
//   connections: [
//     { from: 'node1', to: 'node2', type: 'dashed' },
//   ],
//   connectionTypes: {
//     dashed: { class: 'dashed-arrow', dash: [5, 5], head: 'end' },
//   },
// };
// const canvasDrawer = new CanvasDrawer(config);
