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

window.addEventListener('configLoaded', () => {
  flowchart = new Flowchart(loader.config, localeM, dragMgr);
  canvas  = new CanvasDrawer(loader.config);
  flowchart.rebuild();

  // Ensure the configuration is globally accessible
  window.config = loader.config;

  flowchart.generateLegend(); // Generate the legend dynamically
});

loader.load();
window.addEventListener('localeChanged', () => {
  flowchart.rebuild();
  flowchart.generateLegend(); // Update the legend for the new locale
});
