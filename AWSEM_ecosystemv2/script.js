let config, locale;

// pick up saved locale or default to English
locale = localStorage.getItem('locale') || 'en';
document.documentElement.lang = locale;

// wire up language switcher
const langSwitcher = document.getElementById('languageSwitcher');
langSwitcher.value = locale;
langSwitcher.addEventListener('change', (e) => {
  locale = e.target.value;
  localStorage.setItem('locale', locale);
  document.documentElement.lang = locale;
  rebuild();
});

// fetch the config and render
fetch('config.json')
  .then(r => r.json())
  .then(json => {
    config = json;
    rebuild();
  });

function rebuild() {
  const container = document.getElementById('flowchart');
  container.innerHTML = '';             // clear
  createGroups(container);
  createNodes(container);
  setupCanvas();
  drawAll();
}

function createGroups(root) {
  config.groups.forEach(id => {
    const box = document.createElement('div');
    box.className = 'group-box';
    // we use data-label only for CSS ::before
    box.dataset.label = config.groupLabels[id][locale] || id;
    box.dataset.group = id;
    root.appendChild(box);
  });
}

function createNodes(root) {
  config.nodes.forEach(n => {
    const parent = root.querySelector(`[data-group="${n.group}"]`);
    const el = document.createElement('div');
    if (!parent) {
        console.warn(`Node “${n.id}” refers to missing group “${n.group}”`);
        return;
    }
    
    el.classList.add('node', n.type);
    if (n.external) el.classList.add('external');

    el.dataset.id      = n.id;
    if (n.connects?.length) el.dataset.connect = n.connects.join(',');
    if (n.linkType)    el.dataset.link    = n.linkType;

    el.style.left = n.x + 'px';
    el.style.top  = n.y + 'px';

    el.textContent = n.label[locale] || n.id;
    el.title       = n.tooltip[locale] || '';

    el.addEventListener('click', () => {
      window.location.href = n.link;
    });

    parent.appendChild(el);
    makeDraggable(el);
  });

  // after all nodes exist, size the group‑boxes
  document.querySelectorAll('.group-box')
    .forEach(g => updateGroupBox(g));
}

// ——————— Draggable, Group‑box resizing, Canvas ———————

const canvas = document.getElementById('connections');
const ctx    = canvas.getContext('2d');

function setupCanvas() {
  canvas.width  = document.documentElement.scrollWidth;
  canvas.height = document.documentElement.scrollHeight;
  window.addEventListener('resize', () => {
    canvas.width  = document.documentElement.scrollWidth;
    canvas.height = document.documentElement.scrollHeight;
    drawAll();
  });
  window.addEventListener('scroll', drawAll);
}

// draw all connections
function drawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.querySelectorAll('[data-connect]').forEach(from => {
    const fromId = from.dataset.id;
    if (!fromId) return;
    const targets = from.dataset.connect.split(',');
    const styleType = from.dataset.link || 'default';

    targets.forEach(toId => {
      const to = document.querySelector(`.node[data-id="${toId.trim()}"]`);
      if (!to) return;
      drawArrow(from, to, styleType);
    });
  });
}

function drawArrow(a,b,styleType) {
  const ra = a.getBoundingClientRect(),
        rb = b.getBoundingClientRect();
  const x1 = ra.left + ra.width/2 + window.scrollX,
        y1 = ra.top  + ra.height/2+ window.scrollY;
  const x2 = rb.left + rb.width/2 + window.scrollX,
        y2 = rb.top  + rb.height/2+ window.scrollY;

  ctx.beginPath();
  ctx.setLineDash(styleType==='dependency'?[5,5]:[]);
  ctx.strokeStyle = styleType==='integrable'?'orange': styleType==='dependency'?'red':'cyan';
  ctx.lineWidth = 2;
  ctx.moveTo(x1,y1);
  ctx.bezierCurveTo(x1,y1+40, x2,y2-40, x2,y2);
  ctx.stroke();

  // simple arrowhead
  const ang = Math.atan2(y2-y1, x2-x1),
        sz  = 6;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - sz*Math.cos(ang - Math.PI/6), y2 - sz*Math.sin(ang - Math.PI/6));
  ctx.lineTo(x2 - sz*Math.cos(ang + Math.PI/6), y2 - sz*Math.sin(ang + Math.PI/6));
  ctx.closePath();
  ctx.fill();
}

function updateGroupBox(group) {
    const nodes = Array.from(document.querySelectorAll(`.node`))
      .filter(n => n.closest('.group-box') === group);
    if (nodes.length === 0) return;
  
    // Use left/top style values (absolute positions)
    const xs = nodes.map(n => parseFloat(n.style.left));
    const ys = nodes.map(n => parseFloat(n.style.top));
    const ws = nodes.map(n => n.offsetWidth);
    const hs = nodes.map(n => n.offsetHeight);
  
    const pad = 20;
  
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const maxX = Math.max(...xs.map((x, i) => x + ws[i])) + pad;
    const maxY = Math.max(...ys.map((y, i) => y + hs[i])) + pad;
  
    Object.assign(group.style, {
      left: `${minX}px`,
      top: `${minY}px`,
      width: `${maxX - minX}px`,
      height: `${maxY - minY}px`
    });
  }
  
  
  

function makeDraggable(el) {
    let dragging = false;
    let startMouseX, startMouseY, startElX, startElY;
  
    el.addEventListener('mousedown', e => {
      dragging = true;
  
      // Get initial mouse position
      startMouseX = e.clientX;
      startMouseY = e.clientY;
  
      // Get initial element position
      const style = window.getComputedStyle(el);
      startElX = parseFloat(style.left);
      startElY = parseFloat(style.top);
  
      el.style.cursor = 'grabbing';
      e.preventDefault();
    });
  
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
  
      // Calculate difference in mouse movement
      const dx = e.clientX - startMouseX;
      const dy = e.clientY - startMouseY;
  
      // Set new position based only on relative movement
      el.style.left = `${startElX + dx}px`;
      el.style.top  = `${startElY + dy}px`;
  
      // Update group box if applicable
    //   const grp = el.closest('.group-box');
    //   if (grp) updateGroupBox(grp);
  
      drawAll();
    });
  
    window.addEventListener('mouseup', () => {
      dragging = false;
      el.style.cursor = 'grab';
    });
  }
  
