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
    template: `<a class="button" data-on-click="rotateProperty" title="Rotate Property">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg></a>`,
  });

  // Register the click handler
  logseq.provideModel({
    async rotateProperty() {
      await handleRotation(false);
    }
  });
}
