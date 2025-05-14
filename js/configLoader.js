/**
 * ConfigLoader Class
 * Handles loading configuration files via HTTP requests and dispatches events upon success or failure.
 * 
 * @example
 * // Initialize the ConfigLoader with a custom URL
 * const configLoader = new ConfigLoader('custom-config.json');
 * 
 * // Load the configuration
 * configLoader.load();
 * 
 * // Listen for the configLoaded event
 * window.addEventListener('configLoaded', () => {
 *   console.log('Configuration loaded:', configLoader.config);
 * });
 */
export class ConfigLoader {
  /**
   * @param {string} url - The URL of the configuration file to load.
   */
  constructor(url = 'config.json') {
    this.url = url;
    this.config = null;
  }

  /**
   * Loads the configuration file from the specified URL.
   * Dispatches a 'configLoaded' event on success or logs an error on failure.
   * 
   * @returns {Promise<void>} A promise that resolves when the configuration is loaded.
   */
  async load() {
    try {
      const res = await fetch(this.url);
      if (!res.ok) {
        throw new Error(`Failed to fetch config: ${res.status} ${res.statusText}`);
      }
      this.config = await res.json();
      window.dispatchEvent(new CustomEvent('configLoaded', { detail: { config: this.config } }));
    } catch (err) {
      console.error('Failed to load config:', err);
      window.dispatchEvent(new CustomEvent('configLoadFailed', { detail: { error: err } }));
    }
  }

  /**
   * Gets the loaded configuration.
   * 
   * @returns {object|null} The loaded configuration object, or null if not loaded.
   */
  get currentConfig() {
    return this.config;
  }
}

// // Example usage
// // Initialize the ConfigLoader
// const configLoader = new ConfigLoader('config.json');

// // Load the configuration
// configLoader.load();

// // Listen for the configLoaded event
// window.addEventListener('configLoaded', (event) => {
//   console.log('Configuration loaded:', event.detail.config);
// });

// // Listen for the configLoadFailed event
// window.addEventListener('configLoadFailed', (event) => {
//   console.error('Configuration load failed:', event.detail.error);
// });
