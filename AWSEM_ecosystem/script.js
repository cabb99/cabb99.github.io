let config, locale;

// ————— Initialize locale and fetch config —————
locale = localStorage.getItem('locale') || 'en';
document.documentElement.lang = locale;

const langSwitcher = document.getElementById('languageSwitcher');
langSwitcher.value = locale;
langSwitcher.addEventListener('change', e => {
  locale = e.target.value;
  localStorage.setItem('locale', locale);
  document.documentElement.lang = locale;
  rebuild();
});

const legend = document.querySelector('.legend');
makeDraggable(legend);

const toggle = document.getElementById('theme-toggle');

toggle.addEventListener('click', ()=>{
  const next = document.documentElement.getAttribute('data-theme') === 'dark'? 'light':'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

document.documentElement.setAttribute('data-theme', localStorage.getItem('theme')||'dark');

fetch('config.json')
  .then(r => r.json())
  .then(json => {
    config = json;
    rebuild();
  })
  .catch(console.error);

// ————— Rebuild everything —————
function rebuild(reset = false) {
    const container = document.getElementById('flowchart');
  
    // —— Save current node positions, if any
    const positionMap = {};
    
    if (!reset) {
        document.querySelectorAll('.node').forEach(node => {
        const id = node.dataset.id;
        positionMap[id] = {
            left: node.style.left,
            top: node.style.top
      };
      });
    }
  
    container.innerHTML = '';
    createGroups(container);
    createNodes(container, positionMap);  // 👈 pass the saved positions in
    setupCanvas();
    drawAll();
    forceSimulateNodes(); // Ensure nodes are repositioned responsively
  }

// ————— Create group‑boxes —————
function createGroups(root) {
  config.groups.forEach(id => {
    const box = document.createElement('div');
    box.className = 'group-box';
    box.dataset.group = id;
    box.dataset.label = (config.groupLabels[id]||{})[locale] || id;
    root.appendChild(box);
  });
}

// ————— Create nodes inside their groups —————
function createNodes(root, savedPositions = {}) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const padding = 50; // Padding for top and left
  const extraPadding = 220; // Extra padding for right and bottom

  const maxX = Math.max(...config.nodes.map(n => n.x));
  const minX = Math.min(...config.nodes.map(n => n.x));
  const maxY = Math.max(...config.nodes.map(n => n.y));
  const minY = Math.min(...config.nodes.map(n => n.y));

  const scaleX = (windowWidth - padding - extraPadding) / (maxX - minX || 1);
  const scaleY = (windowHeight - padding - extraPadding) / (maxY - minY || 1);

  config.nodes.forEach(n => {
    const el = document.createElement('div');
    el.classList.add('node', n.type);
    if (n.external) el.classList.add('external');

    el.dataset.id    = n.id;
    el.dataset.group = n.group;
    if (n.connects?.length) el.dataset.connect = n.connects.join(',');
    if (n.linkType)    el.dataset.link = n.linkType;

    // 🧠 Use saved position if it exists, otherwise use config default
    const pos = savedPositions[n.id];
    if (pos) {
      el.style.left = pos.left;
      el.style.top  = pos.top;
    } else {
      el.style.left = padding + (n.x - minX) * scaleX + 'px';
      el.style.top  = padding + (n.y - minY) * scaleY + 'px';
    }

    el.textContent = n.label[locale] || n.id;
    el.title       = n.tooltip[locale] || '';

    el.addEventListener('click', e => {
      if (el._didDrag) {
        e.stopImmediatePropagation();
        e.preventDefault();
        el._didDrag = false;
        return;
      }
      window.open(n.link, '_blank');
    });

    root.appendChild(el);
    makeDraggable(el);
  });

  document.querySelectorAll('.group-box').forEach(updateGroupBox);
}

// ————— Canvas setup & drawing —————
const canvas = document.getElementById('connections');
const ctx    = canvas.getContext('2d');

function setupCanvas() {
  function resize() {
    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

    // Adjust node positions proportionally to the new canvas size
    const nodes = document.querySelectorAll('.node');
    nodes.forEach(node => {
      const left = parseFloat(node.style.left) || 0;
      const top = parseFloat(node.style.top) || 0;

      // Scale positions based on the new canvas dimensions
      node.style.left = (left / canvas.width) * document.documentElement.clientWidth + 'px';
      node.style.top = (top / canvas.height) * document.documentElement.clientHeight + 'px';
    });

    drawAll();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', drawAll);
  resize();
}

function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Safely grab connections
    const conns = Array.isArray(config.connections) ? config.connections : [];
    const types = config.connectionTypes || {};
  
    conns.forEach(conn => {
      const from = document.querySelector(`.node[data-id="${conn.from}"]`);
      const to   = document.querySelector(`.node[data-id="${conn.to}"]`);
      if (!from || !to) return;
  
      const cfg = types[conn.type] || { color:'cyan', dash:[] };
      drawArrow(from, to, {className:cfg.class, dash:cfg.dash, head:cfg.head});
    });
  }
//   
  
function drawArrow(a, b, {
    className = 'arrow',
    dash = [],
    start = 'boundary',  // 'center' or 'boundary'
    end = 'boundary',    // 'center' or 'boundary'
    arrowhead = 'filled',// 'filled', 'open', 'diamond', 'circle', 'none'
    head = 'end'         // 'none', 'start', 'end', 'both'
  } = {}) {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
  
    const c1x = ra.left + ra.width / 2 + window.scrollX;
    const c1y = ra.top + ra.height / 2 + window.scrollY;
    const c2x = rb.left + rb.width / 2 + window.scrollX;
    const c2y = rb.top + rb.height / 2 + window.scrollY;
  
    // Helper function to find intersection with rectangle boundary
    function intersectRect(rect, cx, cy, tx, ty) {
      const dx = tx - cx;
      const dy = ty - cy;
      const w = rect.width / 2;
      const h = rect.height / 2;
      const absDX = Math.abs(dx);
      const absDY = Math.abs(dy);
      let scale;
  
      if (absDX / w > absDY / h) {
        scale = w / absDX;
      } else {
        scale = h / absDY;
      }
      return [cx + dx * scale, cy + dy * scale];
    }
  
    // Calculate exact arrow start and end points
    const [startX, startY] = start === 'boundary' ? intersectRect(ra, c1x, c1y, c2x, c2y) : [c1x, c1y];
    const [endX, endY]     = end === 'boundary' ? intersectRect(rb, c2x, c2y, c1x, c1y) : [c2x, c2y];
  
    // Adaptive Bezier curve
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.hypot(dx, dy);
    const curveStrength = Math.min(80, dist / 12);
    const norm = Math.hypot(dx, dy);
    const [px, py] = [-dy / norm, dx / norm];
  
    const cp1x = startX + dx / 3 + px * curveStrength;
    const cp1y = startY + dy / 3 + py * curveStrength;
    const cp2x = startX + 2 * dx / 3 - px * curveStrength;
    const cp2y = startY + 2 * dy / 3 - py * curveStrength;
  
    // Create a temporary DOM element to extract computed style
    const dummy = document.createElement('div');
    dummy.className = `arrow-color ${className}`;
    document.body.appendChild(dummy);
    const color = getComputedStyle(dummy).getPropertyValue('color') || 'cyan';
    dummy.remove();

    // Draw curve
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();
  
    // Helper: draw arrowhead
    function drawArrowhead(x, y, angle, style) {
      const sz = 10;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      switch (style) {
        case 'filled':
          ctx.moveTo(0,0);
          ctx.lineTo(-sz, sz/2);
          ctx.lineTo(-sz, -sz/2);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          break;
        case 'open':
          ctx.moveTo(-sz, sz/2);
          ctx.lineTo(0,0);
          ctx.lineTo(-sz, -sz/2);
          ctx.stroke();
          break;
        case 'diamond':
          ctx.moveTo(0,0);
          ctx.lineTo(-sz/2, sz/2);
          ctx.lineTo(-sz,0);
          ctx.lineTo(-sz/2,-sz/2);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          break;
        case 'circle':
          ctx.arc(-sz/2, 0, sz/2, 0, 2*Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
          break;
        case 'none':
        default:
          break;
      }
      ctx.restore();
    }
  
    // Draw arrowheads based on 'head' option
    const angleStart = Math.atan2(cp1y - startY, cp1x - startX);
    const angleEnd   = Math.atan2(endY - cp2y, endX - cp2x);
  
    if (head === 'end' || head === 'both') {
      drawArrowhead(endX, endY, angleEnd, arrowhead);
    }
    if (head === 'start' || head === 'both') {
      drawArrowhead(startX, startY, angleStart + Math.PI, arrowhead);
    }
  }
  
  
// ————— SIZE GROUP BOX TO WRAP CHILDREN —————
function updateGroupBox(group) {
    const groupName = group.dataset.group;
    // find nodes that belong to this group
    const nodes = Array.from(
      document.querySelectorAll(`.flowchart > .node[data-group="${groupName}"]`)
    );
    if (!nodes.length) return;
  
    const pad = 25;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
    nodes.forEach(n => {
      const x = n.offsetLeft;
      const y = n.offsetTop;
      const w = n.offsetWidth;
      const h = n.offsetHeight;
  
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
  
    group.style.left   = (minX - pad) + 'px';
    group.style.top    = (minY - pad) + 'px';
    group.style.left   = Math.max(0, minX - pad) + 'px';
    group.style.top    = Math.max(0, minY - pad) + 'px';
    group.style.width  = Math.min(window.innerWidth  - parseFloat(group.style.left), maxX - minX + 2*pad) + 'px';
    group.style.height = Math.min(window.innerHeight - parseFloat(group.style.top),  maxY - minY + 2*pad) + 'px';
    
  }
  

// ————— DRAGGING —————
function makeDraggable(el) {
    let dragging = false;
    let startX, startY, origX, origY;

    el._didDrag = false;

    el.addEventListener('mousedown', e => {
      dragging = true;
      el._didDrag = false;
      startX = e.clientX;
      startY = e.clientY;
      origX  = el.offsetLeft;
      origY  = el.offsetTop;
      el.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!dragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!el._didDrag && (Math.abs(dx) + Math.abs(dy) > 3)) {
        el._didDrag = true;
      }

      el.style.left = origX + dx + 'px';
      el.style.top  = origY + dy + 'px';
      drawAll();

      const grpName = el.dataset.group;
      const grp = document.querySelector(`.group-box[data-group="${grpName}"]`);
      if (grp) updateGroupBox(grp);
    });

    window.addEventListener('mouseup', () => {
      dragging = false;
      el.style.cursor = 'grab';
      forceSimulateNodes(); // Use force-directed simulation after drag
    });

    el.addEventListener('touchstart', e => {
        dragging = true;
        el._didDrag = false;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        origX  = el.offsetLeft;
        origY  = el.offsetTop;
        e.preventDefault();
      }, { passive: false });
      
    window.addEventListener('touchmove', e => {
        if (!dragging) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
      
        if (!el._didDrag && (Math.abs(dx) + Math.abs(dy) > 3)) {
          el._didDrag = true;
        }
      
        el.style.left = origX + dx + 'px';
        el.style.top  = origY + dy + 'px';
        drawAll();
      
        const grpName = el.dataset.group;
        const grp = document.querySelector(`.group-box[data-group="${grpName}"]`);
        if (grp) updateGroupBox(grp);
      }, { passive: false });
      
      window.addEventListener('touchend', () => {
        dragging = false;
        forceSimulateNodes();
      }, { passive: false });
}

// ————— FORCE‑DIRECTED BOX COLLISION + SPATIAL HASH —————
function forceSimulateNodes() {
  const nodeEls = Array.from(document.querySelectorAll('.node'));
  if (nodeEls.length < 2) return;

  // ── Params ───────────────────────────────────────────
  const padding    = 20;    // extra gap from edges
  const dt         = 0.2;   // fixed time step
  const damping    = 0.8;   // velocity decay
  const maxSteps   = 40;   // max frames
  const maxVel     = 10;    // clamp speed
  const cellSize   = 150;   // grid size ≥ max(w,h)+padding

  // ── Build sim state ──────────────────────────────────
  let simNodes = nodeEls.map(el => {
    const w   = el.offsetWidth;
    const h   = el.offsetHeight;
    const x0  = parseFloat(el.style.left) || 0;
    const y0  = parseFloat(el.style.top)  || 0;
    return {
      el,
      w, h,
      halfW: w/2 + padding,
      halfH: h/2 + padding,
      // store center coords
      x: x0 + w/2,
      y: y0 + h/2,
      vx: 0,
      vy: 0
    };
  });

  let step = 0;
  const bound = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  let continue_anim = true;
  function stop_animation() {
    continue_anim = false;
  }
  
  nodeEls.forEach(el => {
    el.addEventListener('click', stop_animation);
  });


  function tick() {
    // 1) build spatial hash
    const buckets = new Map();
    simNodes.forEach((n,i) => {
      const key = `${Math.floor(n.x/cellSize)},${Math.floor(n.y/cellSize)}`;
      (buckets.get(key) || buckets.set(key, []).get(key)).push(i);
    });

    // 2) box‐overlap repulsion: only when AABBs overlap
    simNodes.forEach((a,i) => {
      const cellX = Math.floor(a.x/cellSize),
            cellY = Math.floor(a.y/cellSize);

      // check self + neighbors
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const list = buckets.get(`${cellX+dx},${cellY+dy}`);
          if (!list) continue;
          for (let j of list) {
            if (j <= i) continue;
            const b = simNodes[j];
            let dxC = b.x - a.x,
                dyC = b.y - a.y;
            const overlapX = a.halfW + b.halfW - Math.abs(dxC);
            const overlapY = a.halfH + b.halfH - Math.abs(dyC);

            if (overlapX > 0 && overlapY > 0) {
              // push on smaller‐overlap axis
              if (overlapX < overlapY) {
                const sign = dxC < 0 ? -1 : 1;
                const f = overlapX * 0.5; // spring K=0.5
                a.vx -= f * sign * dt;
                b.vx += f * sign * dt;
              } else {
                const sign = dyC < 0 ? -1 : 1;
                const f = overlapY * 0.5;
                a.vy -= f * sign * dt;
                b.vy += f * sign * dt;
              }
            }
          }
        }
      }
    });

    // 3) integrate + damping + clamp + bounds
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

      // keep center inside padded viewport
      const halfW = n.w/2, halfH = n.h/2;
      n.x = bound(n.x, padding + halfW, window.innerWidth  - padding - halfW);
      n.y = bound(n.y, padding + halfH, window.innerHeight - padding - halfH);

      // write back top/left
      n.el.style.left = (n.x - halfW) + 'px';
      n.el.style.top  = (n.y - halfH) + 'px';
    });

    // 4) redraw dependent UI
    document.querySelectorAll('.group-box').forEach(updateGroupBox);
    drawAll();

    // next frame?
    if (continue_anim && (++step < maxSteps)) requestAnimationFrame(tick);
  }

  tick();
}

