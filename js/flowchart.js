// flowchart.js
// Builds groups and nodes based on config, handles locale, and wires up dragging + force layout

import { ForceSimulator } from './forceSimulator.js';

/**
 * Flowchart Class
 * Builds groups and nodes based on configuration, handles locale changes, and integrates dragging and force layout simulation.
 * 
 * @example
 * const flowchart = new Flowchart(config, localeManager, dragManager);
 * flowchart.rebuild();
 */
export class Flowchart {
  /**
   * @param {Object} config - Parsed configuration object.
   * @param {LocaleManager} localeManager - Manages current locale.
   * @param {DragManager} dragManager - Makes elements draggable.
   */
  constructor(config, localeManager, dragManager) {
    this.config = config;
    this.localeManager = localeManager;
    this.dragManager = dragManager;
    this.container = document.getElementById('flowchart');
    if (!this.container) {
      throw new Error('Element with id "flowchart" not found.');
    }

    // Initialize resize handling
    this.prevW = window.innerWidth;
    this.prevH = window.innerHeight;
    this._resizeTimer = null;
    window.addEventListener('resize', this._onResize.bind(this));
  }

  /**
   * Handles window resize events to rescale nodes, update group boxes, and redraw connections.
   * @private
   */
  _onResize() {
    const newW = window.innerWidth;
    const newH = window.innerHeight;
    const ratioX = newW / this.prevW;
    const ratioY = newH / this.prevH;

    // Incrementally scale nodes
    this.container.querySelectorAll('.node').forEach(el => {
      const x = parseFloat(el.style.left) || 0;
      const y = parseFloat(el.style.top)  || 0;
      el.style.left = x * ratioX + 'px';
      el.style.top  = y * ratioY + 'px';
    });

    this.prevW = window.innerWidth;
    this.prevH = window.innerHeight;

    // Update group boxes and redraw connections
    this.updateGroupBoxes();
    window.dispatchEvent(new Event('scroll'));

    // Schedule force simulation after resize settles
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      ForceSimulator.simulate();
    }, 200);
  }

  /**
   * Rebuilds the entire flowchart. Restores positions unless `reset` is true.
   * 
   * @param {boolean} reset - If true, resets positions to default layout.
   */
  rebuild(reset = false) {
    const positionMap = this._saveCurrentPositions(reset);
    this.container.innerHTML = '';
    this._createGroups();
    this._createNodes(positionMap);
    this._updateAllGroupBoxes();
    window.dispatchEvent(new Event('scroll'));
    ForceSimulator.simulate();
  }

  /**
   * Saves the current positions of nodes unless reset is true.
   * 
   * @param {boolean} reset - If true, skips saving positions.
   * @returns {Object} A map of node positions.
   * @private
   */
  _saveCurrentPositions(reset) {
    const positionMap = {};
    if (!reset) {
      this.container.querySelectorAll('.node').forEach(node => {
        positionMap[node.dataset.id] = {
          left: node.style.left,
          top: node.style.top
        };
      });
    }
    return positionMap;
  }

  /**
   * Public alias to update group boxes.
   */
  updateGroupBoxes() {
    this._updateAllGroupBoxes();
  }

  /**
   * Public method to trigger force simulation.
   */
  forceSimulate() {
    ForceSimulator.simulate();
  }

  /**
   * Creates group boxes based on the configuration.
   * @private
   */
  _createGroups() {
    const { groups, groupLabels } = this.config;
    const locale = this.localeManager.current;
    groups.forEach(id => {
      const box = document.createElement('div');
      box.classList.add('group-box');
      box.dataset.group = id;
      box.dataset.label = (groupLabels[id]?.[locale]) || id;
      this.container.appendChild(box);
    });
  }

  /**
   * Creates nodes based on the configuration and restores their positions if available.
   * 
   * @param {Object} positionMap - A map of node positions.
   * @private
   */
  _createNodes(positionMap) {
    const nodes = this.config.nodes;
    const locale = this.localeManager.current;
    const layout = this._computeDefaultLayout(nodes);

    nodes.forEach(n => {
      const el = this._createNodeElement(n, locale, positionMap, layout);
      this.container.appendChild(el);
      this.dragManager.makeDraggable(el);
    });
  }

  /**
   * Computes the default layout bounds for nodes.
   * 
   * @param {Array} nodes - Array of node objects.
   * @returns {Object} Layout bounds and scaling factors.
   * @private
   */
  _computeDefaultLayout(nodes) {
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const padding = 50, extra = 220;
    const width  = window.innerWidth  - padding - extra;
    const height = window.innerHeight - padding - extra;
    return {
      minX, minY,
      scaleX: width  / (maxX - minX || 1),
      scaleY: height / (maxY - minY || 1),
      padding
    };
  }

  /**
   * Creates a single node element.
   * 
   * @param {Object} node - Node configuration object.
   * @param {string} locale - Current locale.
   * @param {Object} positionMap - Map of saved positions.
   * @param {Object} layout - Default layout bounds and scaling factors.
   * @returns {HTMLElement} The created node element.
   * @private
   */
  _createNodeElement(node, locale, positionMap, layout) {
    const el = document.createElement('div');
    el.classList.add('node', node.type);
    if (node.external) el.classList.add('external');
    el.dataset.id    = node.id;
    el.dataset.group = node.group;
    if (node.connects?.length) el.dataset.connect = node.connects.join(',');
    if (node.linkType)    el.dataset.link    = node.linkType;

    const pos = positionMap[node.id];
    if (pos) {
      el.style.left = pos.left;
      el.style.top  = pos.top;
    } else {
      el.style.left = layout.padding + (node.x - layout.minX) * layout.scaleX + 'px';
      el.style.top  = layout.padding + (node.y - layout.minY) * layout.scaleY + 'px';
    }

    el.textContent = node.label[locale] || node.id;
    el.title       = node.tooltip?.[locale] || '';

    el.addEventListener('click', e => {
      if (el._didDrag) {
        e.stopImmediatePropagation();
        e.preventDefault();
        el._didDrag = false;
        return;
      }
      window.open(node.link, '_blank');
    });

    return el;
  }

  /**
   * Updates all group boxes to fit their contained nodes.
   * @private
   */
  _updateAllGroupBoxes() {
    this.container.querySelectorAll('.group-box').forEach(box => {
      this._updateGroupBox(box);
    });
  }

  /**
   * Updates a single group box to fit its contained nodes.
   * 
   * @param {HTMLElement} group - The group box element.
   * @private
   */
  _updateGroupBox(group) {
    const groupName = group.dataset.group;
    const nodes = Array.from(
      this.container.querySelectorAll(`.node[data-group="${groupName}"]`)
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
    group.style.width  = Math.min(window.innerWidth - left, maxX - minX + pad * 2) + 'px';
    group.style.height = Math.min(window.innerHeight - top, maxY - minY + pad * 2) + 'px';
  }

  /**
   * Dynamically generates the legend based on the configuration.
   */
  generateLegend() {
    const legendContainer = document.querySelector('.legend');
    if (!legendContainer) return;

    // Remove all children except the toggle button
    Array.from(legendContainer.children).forEach(child => {
      if (!child.classList.contains('legend-toggle')) legendContainer.removeChild(child);
    });

    // Add or update the title outside legend-content
    let title = legendContainer.querySelector('.legend-title');
    if (!title) {
      title = document.createElement('strong');
      title.className = 'legend-title';
      title.setAttribute('data-i18n', 'legend.title');
      legendContainer.appendChild(title);
    }
    title.textContent = window.config.legend.title[this.localeManager.current] || 'Legend:';

    // Use a dedicated content wrapper inside the legend
    let content = legendContainer.querySelector('.legend-content');
    if (!content) {
      content = document.createElement('div');
      content.className = 'legend-content';
      legendContainer.appendChild(content);
    }
    content.innerHTML = '';

    // Add columns inside legend-content
    const columns = document.createElement('div');
    columns.classList.add('legend-columns');

    // Helper to create list items
    const createList = (items, className) => {
      const ul = document.createElement('ul');
      ul.classList.add(className);
      items.forEach(item => {
        const li = document.createElement('li');
        if (item.svg) {
          li.innerHTML = `<svg class="arrow ${item.class}" width="20" height="20">
            <path d="M0 5 Q10 0 20 5"/>
            <polygon points="20,5 15,3 15,7"/>
          </svg>
          <span data-i18n="${item.i18n}">${item.label}</span>`;
        } else {
          li.innerHTML = `<span class="legend-${item.class}">${item.label}</span>`;
        }
        ul.appendChild(li);
      });
      return ul;
    };

    // Left column: Node types
    const leftItems = ['forcefield', 'analysis', 'utility', 'training', 'server'].map(type => ({
      class: type,
      label: window.config.legend[type][this.localeManager.current] || type.charAt(0).toUpperCase() + type.slice(1)
    }));
    columns.appendChild(createList(leftItems, 'legend-left'));

    // Right column: Connection types
    const rightItems = [
      { class: 'internal', label: window.config.legend.internal[this.localeManager.current] },
      { class: 'external', label: window.config.legend.external[this.localeManager.current] },
      ...Object.entries(window.config.connectionTypes).map(([key, value]) => ({
        class: value.class,
        label: value.label[this.localeManager.current],
        svg: true,
        i18n: `connection.${key}`
      }))
    ];
    columns.appendChild(createList(rightItems, 'legend-right'));

    content.appendChild(columns);
  }
}
