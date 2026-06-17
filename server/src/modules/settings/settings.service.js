import { SettingsModel } from './settings.model.js';

export const SettingsService = {
  get() {
    return SettingsModel.get();
  },

  update(input) {
    return SettingsModel.update(input);
  },
};
