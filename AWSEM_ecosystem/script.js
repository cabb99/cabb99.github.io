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
      el.style.left = 50 + 2 * n.x + 'px';
      el.style.top  = -120 + 2 * n.y + 'px';
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
      window.location.href = n.link;
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
    canvas.width  = document.documentElement.scrollWidth;
    canvas.height = document.documentElement.scrollHeight;
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
      drawArrow(from, to, {color:cfg.color, dash:cfg.dash, head:cfg.head});
    });
  }
//   
  
function drawArrow(a, b, {
    color = 'cyan',
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
  
    // Draw curve
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
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
    group.style.width  = (maxX - minX + 2*pad) + 'px';
    group.style.height = (maxY - minY + 2*pad) + 'px';
  }
  

// ————— DRAGGING —————
function makeDraggable(el) {
    let dragging = false;
    let startX, startY, origX, origY;
  
    // we’ll flip this to true as soon as we move
    el._didDrag = false;
  
    el.addEventListener('mousedown', e => {
      dragging = true;
      el._didDrag = false;            // reset on each new press
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
  
      // if we’ve actually moved more than a handful of pixels, mark it
      if (!el._didDrag && (Math.abs(dx) + Math.abs(dy) > 3)) {
        el._didDrag = true;
      }
  
      el.style.left = origX + dx + 'px';
      el.style.top  = origY + dy + 'px';
      drawAll();
  
      // update its group box as you already do
      const grpName = el.dataset.group;
      const grp = document.querySelector(`.group-box[data-group="${grpName}"]`);
      if (grp) updateGroupBox(grp);
    });
  
    window.addEventListener('mouseup', () => {
      dragging = false;
      el.style.cursor = 'grab';
    });
  }