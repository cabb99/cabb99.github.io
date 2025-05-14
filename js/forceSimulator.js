// forceSimulator.js
// Implements a simple force-directed layout with box collision and spatial hashing

export class ForceSimulator {
  /**
   * Runs the force-directed layout on all .node elements and updates .group-boxes + redraws arrows.
   */
  static simulate() {
    const nodeEls = Array.from(document.querySelectorAll('.node'));
    if (nodeEls.length < 2) return;

    const padding  = 20;
    const dt       = 0.2;
    const damping  = 0.8;
    const maxSteps = 40;
    const maxVel   = 10;
    const cellSize = 150;

    const simNodes = nodeEls.map(el => {
      const w  = el.offsetWidth;
      const h  = el.offsetHeight;
      const x0 = parseFloat(el.style.left) || 0;
      const y0 = parseFloat(el.style.top)  || 0;
      return {
        el,
        w, h,
        halfW: w/2 + padding,
        halfH: h/2 + padding,
        x: x0 + w/2,
        y: y0 + h/2,
        vx: 0,
        vy: 0
      };
    });

    let step = 0;
    let running = true;
    const bound = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const stop = () => { running = false; };
    nodeEls.forEach(el => el.addEventListener('click', stop));

    function tick() {
      // 1) spatial hash
      const buckets = new Map();
      simNodes.forEach((n,i) => {
        const key = `${Math.floor(n.x/cellSize)},${Math.floor(n.y/cellSize)}`;
        const list = buckets.get(key) || [];
        list.push(i);
        buckets.set(key, list);
      });

      // 2) repulsion
      simNodes.forEach((a,i) => {
        const cellX = Math.floor(a.x/cellSize);
        const cellY = Math.floor(a.y/cellSize);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const list = buckets.get(`${cellX+dx},${cellY+dy}`);
            if (!list) continue;
            list.forEach(j => {
              if (j <= i) return;
              const b = simNodes[j];
              const dxC = b.x - a.x;
              const dyC = b.y - a.y;
              const overlapX = a.halfW + b.halfW - Math.abs(dxC);
              const overlapY = a.halfH + b.halfH - Math.abs(dyC);
              if (overlapX > 0 && overlapY > 0) {
                if (overlapX < overlapY) {
                  const sign = dxC < 0 ? -1 : 1;
                  const f = overlapX * 0.5;
                  a.vx -= f * sign * dt;
                  b.vx += f * sign * dt;
                } else {
                  const sign = dyC < 0 ? -1 : 1;
                  const f = overlapY * 0.5;
                  a.vy -= f * sign * dt;
                  b.vy += f * sign * dt;
                }
              }
            });
          }
        }
      });

      // 3) integrate + clamp + bounds
      simNodes.forEach(n => {
        n.vx *= damping;
        n.vy *= damping;
        const speed = Math.hypot(n.vx, n.vy);
        if (speed > maxVel) {
          n.vx = n.vx / speed * maxVel;
          n.vy = n.vy / speed * maxVel;
        }
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        const halfW = n.w/2;
        const halfH = n.h/2;
        n.x = bound(n.x, padding + halfW, window.innerWidth  - padding - halfW);
        n.y = bound(n.y, padding + halfH, window.innerHeight - padding - halfH);
        n.el.style.left = (n.x - halfW) + 'px';
        n.el.style.top  = (n.y - halfH) + 'px';
      });

      // 4) update groups
      document.querySelectorAll('.group-box').forEach(group => {
        // same logic as in Flowchart._updateGroupBox
        const groupName = group.dataset.group;
        const nodes = Array.from(
          document.querySelectorAll(`.node[data-group="${groupName}"]`)
        );
        if (!nodes.length) return;
        const pad = 25;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(n => {
          const x = n.offsetLeft, y = n.offsetTop;
          const w = n.offsetWidth, h = n.offsetHeight;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + w);
          maxY = Math.max(maxY, y + h);
        });
        const left = Math.max(0, minX - pad);
        const top  = Math.max(0, minY - pad);
        group.style.left   = left + 'px';
        group.style.top    = top  + 'px';
        group.style.width  = Math.min(window.innerWidth-left, maxX-minX+pad*2) + 'px';
        group.style.height = Math.min(window.innerHeight-top, maxY-minY+pad*2) + 'px';
      });

      // 5) redraw arrows via scroll event
      window.dispatchEvent(new Event('scroll'));

      if (running && ++step < maxSteps) {
        requestAnimationFrame(tick);
      }
    }

    tick();
  }
}
