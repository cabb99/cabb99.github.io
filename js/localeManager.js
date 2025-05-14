/**
 * LocaleManager Class
 * Manages the application's language settings, including persistence, DOM updates, and event dispatching.
 * 
 * @example
 * // Initialize the LocaleManager with default language 'en'
 * const localeManager = new LocaleManager('en', ['en', 'es', 'fr']);
 * 
 * // Access the current language
 * console.log(localeManager.current); // Outputs: 'en'
 * 
 * // Clean up when no longer needed
 * localeManager.destroy();
 */
export class LocaleManager {
  /**
   * @param {string} defaultLang - The default language to use if no language is stored.
   * @param {string[]} supportedLocales - An array of supported language codes.
   */
  constructor(defaultLang = 'en', supportedLocales = ['en', 'es', 'fr']) {
    const storedLang = localStorage.getItem('locale');
    this.lang = supportedLocales.includes(storedLang) ? storedLang : defaultLang;
    document.documentElement.lang = this.lang;

    this.switcher = document.getElementById('languageSwitcher');
    if (!this.switcher) {
      this.switcher = document.createElement('select');
      this.switcher.id = 'languageSwitcher';
      document.body.appendChild(this.switcher);
    }

    this.switcher.value = this.lang;
    this.switcher.addEventListener('change', this.onChange.bind(this));

    window.addEventListener('message', (event) => {
      if (event.data && event.data.locale) {
        const newLocale = event.data.locale;
        if (this.lang !== newLocale) {
          this.lang = newLocale;
          localStorage.setItem('locale', this.lang);
          document.documentElement.lang = this.lang;
          const localeChangedEvent = new CustomEvent('localeChanged', { detail: { lang: this.lang } });
          window.dispatchEvent(localeChangedEvent);
        }
      }
    });
  }

  /**
   * Handles language change events from the language switcher.
   * Updates the language, persists it, and dispatches a custom event.
   * 
   * @param {Event} e - The change event triggered by the language switcher.
   */
  onChange(e) {
    this.lang = e.target.value;
    localStorage.setItem('locale', this.lang);
    document.documentElement.lang = this.lang;
    const event = new CustomEvent('localeChanged', { detail: { lang: this.lang } });
    window.dispatchEvent(event);
  }

  /**
   * Gets the current language.
   * 
   * @returns {string} The current language code.
   */
  get current() {
    return this.lang;
  }

  /**
   * Cleans up event listeners to prevent memory leaks.
   */
  destroy() {
    if (this.switcher) {
      this.switcher.removeEventListener('change', this.onChange.bind(this));
    }
  }
}

// // Example usage
// // Initialize the LocaleManager
// const localeManager = new LocaleManager('en', ['en', 'es', 'fr']);

// // Log the current language
// console.log(`Current language: ${localeManager.current}`);

// // Listen for language changes
// window.addEventListener('localeChanged', (event) => {
//   console.log(`Language changed to: ${event.detail.lang}`);
// });

// // Clean up when the LocaleManager is no longer needed
// // localeManager.destroy();