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
    template: `<a data-on-click="rotateProperty" title="Rotate Property" style="display:flex;align-items:center;justify-content:center;"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='1' y='1' width='22' height='22' rx='5' ry='5' fill='%23eef2ff' stroke='%236366f1' stroke-width='1.5'/%3E%3Cg transform='translate(2.4,2.4) scale(0.8)' stroke='%236366f1' stroke-width='1.5'%3E%3Cpath d='M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2'/%3E%3C/g%3E%3C/svg%3E" style="width:18px;height:18px;"/></a>`,
  });

  // Register the click handler
  logseq.provideModel({
    async rotateProperty() {
      await handleRotation(false);
    }
  });
}
