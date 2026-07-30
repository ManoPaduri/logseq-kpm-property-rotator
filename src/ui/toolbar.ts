/**
 * Toolbar button component for Property Rotator plugin
 * This module handles the toolbar button UI
 * Contract: Provides toolbar button registration with click handler
 */

import "@logseq/libs";
import { handleRotation } from '../shortcuts';
import { getLastKnownEditingUuid } from '../api/logseq';

/**
 * Register toolbar button for the plugin
 */
export function registerToolbarButton(): void {
  logseq.App.registerUIItem("toolbar", {
    key: "property-rotator",
    template: `<a class="button" data-on-click="rotateProperty" title="Rotate Property (main)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
      </svg></a>`,
  });

  logseq.App.registerUIItem("toolbar", {
    key: "property-rotator-sub",
    template: `<a class="button" data-on-click="subRotateProperty" title="Sub-Rotate Property">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 15 3 19 7 23"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg></a>`,
  });

  // Register click handlers
  // Re-enter the block in edit mode before rotating so the editor stays open through updateBlock.
  logseq.provideModel({
    async rotateProperty() {
      const uuid = getLastKnownEditingUuid();
      if (uuid) await logseq.Editor.editBlock(uuid);
      await handleRotation(false);
    },
    async subRotateProperty() {
      const uuid = getLastKnownEditingUuid();
      if (uuid) await logseq.Editor.editBlock(uuid);
      await handleRotation(true);
    }
  });
}
