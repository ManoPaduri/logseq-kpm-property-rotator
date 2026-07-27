/**
 * Toolbar button component for Property Rotator plugin
 * This module handles the toolbar button UI
 * Contract: Provides toolbar button registration with click handler
 */

import "@logseq/libs";
import { handleRotation } from '../shortcuts';

/**
 * Register toolbar button for the plugin
 */
export function registerToolbarButton(): void {
  logseq.App.registerUIItem("toolbar", {
    key: "property-rotator",
    template: `<a data-on-click="rotateProperty" title="Rotate Property">🔄</a>`,
  });

  // Register the click handler
  logseq.provideModel({
    async rotateProperty() {
      await handleRotation(false);
    }
  });
}
