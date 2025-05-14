/**
 * ThemeManager Class
 * Manages the application's theme settings, including persistence and DOM updates.
 * 
 * @example
 * // Initialize the ThemeManager with default theme 'dark'
 * const themeManager = new ThemeManager('dark');
 * 
 * // Toggle the theme
 * themeManager.toggle();
 */
export class ThemeManager {
  /**
   * @param {string} defaultTheme - The default theme to use if no theme is stored.
   */
  constructor(defaultTheme = 'dark') {
    this.key = 'theme';
    this.theme = localStorage.getItem(this.key) || defaultTheme;
    document.documentElement.dataset.theme = this.theme;

    this.toggleButton = document.getElementById('theme-toggle');
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', this.toggle.bind(this));
    } else {
      console.warn('Theme toggle button not found.');
    }
  }

  /**
   * Toggles the theme between 'dark' and 'light'.
   * Updates the theme in localStorage and the DOM.
   */
  toggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(this.key, this.theme);
    document.documentElement.dataset.theme = this.theme;
    const event = new CustomEvent('themeChanged', { detail: { theme: this.theme } });
    window.dispatchEvent(event);
  }

  /**
   * Gets the current theme.
   * 
   * @returns {string} The current theme.
   */
  get current() {
    return this.theme;
  }

  /**
   * Cleans up event listeners to prevent memory leaks.
   */
  destroy() {
    if (this.toggleButton) {
      this.toggleButton.removeEventListener('click', this.toggle.bind(this));
    }
  }
}

// // Example usage
// // Initialize the ThemeManager
// const themeManager = new ThemeManager('dark');

// // Log the current theme
// console.log(`Current theme: ${themeManager.current}`);

// // Listen for theme changes
// window.addEventListener('themeChanged', (event) => {
//   console.log(`Theme changed to: ${event.detail.theme}`);
// });

// // Clean up when the ThemeManager is no longer needed
// // themeManager.destroy();
