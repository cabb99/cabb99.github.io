import { LocaleManager } from '../js/localeManager.js';
import { ThemeManager }  from '../js/themeManager.js';
import { ConfigLoader }  from '../js/configLoader.js';
import { Flowchart }     from '../js/flowchart.js';
import { CanvasDrawer }  from '../js/canvasDrawer.js';
import { DragManager }   from '../js/dragManager.js';

// Declare flowchart and canvas variables at the top to ensure they are accessible globally
let flowchart;
let canvas;

const localeM = new LocaleManager();
const themeM  = new ThemeManager();
const loader  = new ConfigLoader();

const dragMgr = new DragManager(
  () => {
    flowchart.updateGroupBoxes();
    canvas.drawAll();        // redraw arrows immediately
  },
  () => {
    flowchart.forceSimulate(); 
  }
);

// Make the legend draggable
const legend = document.querySelector('.legend');
if (legend) dragMgr.makeDraggable(legend);

function injectLegendToggle() {
  const legendBar = document.getElementById('legend');
  if (!legendBar) { console.log('No legendBar found'); return; }
  // Remove existing toggle if present
  const oldToggle = document.getElementById('legend-toggle');
  if (oldToggle) oldToggle.remove();

  // Always set minimized class from localStorage before rendering toggle
  const minimized = localStorage.getItem('legendMinimized') === 'true';
  if (minimized) legendBar.classList.add('minimized');
  else legendBar.classList.remove('minimized');

  // Create toggle button
  const btn = document.createElement('button');
  btn.className = 'legend-toggle';
  btn.id = 'legend-toggle';
  // Set icon and label based on actual class
  const isMin = legendBar.classList.contains('minimized');
  btn.setAttribute('aria-label', isMin ? 'Show legend' : 'Minimize legend');
  btn.title = isMin ? 'Show legend' : 'Minimize legend';
  btn.style.position = 'absolute';
  btn.style.top = '8px';
  btn.style.right = '8px';
  btn.style.left = 'auto';
  // Icon
  const icon = document.createElement('span');
  icon.id = 'legend-toggle-icon';
  icon.innerHTML = isMin ? '&#x25A1;' : '&#x2212;';
  btn.appendChild(icon);
  // Handler
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    legendBar.classList.toggle('minimized');
    const nowMin = legendBar.classList.contains('minimized');
    icon.innerHTML = nowMin ? '&#x25A1;' : '&#x2212;';
    btn.title = nowMin ? 'Show legend' : 'Minimize legend';
    btn.setAttribute('aria-label', btn.title);
    localStorage.setItem('legendMinimized', nowMin);
    console.log('Legend toggle clicked. Minimized:', nowMin, legendBar);
  });
  // Always insert as the first child of the legend container
  legendBar.insertBefore(btn, legendBar.firstChild);
  console.log('Legend toggle button inserted');
}

window.addEventListener('configLoaded', () => {
  flowchart = new Flowchart(loader.config, localeM, dragMgr);
  canvas  = new CanvasDrawer(loader.config);
  flowchart.rebuild();
  window.config = loader.config;
  flowchart.generateLegend();
  injectLegendToggle(); // Always call last
});

loader.load();
window.addEventListener('localeChanged', () => {
  flowchart.rebuild();
  flowchart.generateLegend();
  injectLegendToggle(); // Always call last
});

console.log('AWSEM legend script loaded');
