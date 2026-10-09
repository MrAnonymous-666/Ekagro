const deviceStorage = {
  isNative() {
    return !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences);
  },
  async get(key) {
    if (this.isNative()) {
      const { value } = await window.Capacitor.Plugins.Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },
  async set(key, value) {
    if (this.isNative()) {
      await window.Capacitor.Plugins.Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },
  async remove(key) {
    if (this.isNative()) {
      await window.Capacitor.Plugins.Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  }
};
