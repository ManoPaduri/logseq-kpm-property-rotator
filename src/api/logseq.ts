/**
 * Logseq API wrapper for Property Rotator plugin
 * This module wraps all Logseq API calls with consistent error handling
 * Contract: All functions return null/false on error, never throw
 */

import "@logseq/libs";
import { BlockInfo } from '../types';

/**
 * Detect which property name the cursor is currently on.
 * Returns the property name (e.g. "location") if cursor is on a "key:: value" line,
 * or null if cursor is on the block content line or not in editor.
 */
export async function getCursorProperty(): Promise<string | null> {
  try {
    // top.document may be cross-origin blocked — fall back safely
    let doc: Document | null = null;
    try { doc = top?.document ?? null; } catch { /* cross-origin blocked */ }
    if (!doc) { try { doc = window.parent?.document ?? null; } catch { /* blocked */ } }
    if (!doc) doc = document;

    const el = (
      doc.activeElement as HTMLElement | null
    );
    let content: string | null = null;
    let cursorPos: number | null = null;

    if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
      const inp = el as HTMLTextAreaElement;
      content = inp.value;
      cursorPos = inp.selectionStart;
    } else {
      // CodeMirror / contenteditable fallback — use Logseq API for content
      content = await logseq.Editor.getEditingBlockContent();

      // Try to read cursor offset from selection in contenteditable
      let sel: Selection | null = null;
      try { sel = top?.getSelection() ?? null; } catch { /* cross-origin blocked */ }
      if (!sel) { try { sel = window.parent?.getSelection() ?? null; } catch { /* blocked */ } }
      if (!sel) sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(range.startContainer.parentElement ?? doc.body);
        preRange.setEnd(range.startContainer, range.startOffset);
        cursorPos = preRange.toString().length;
      }
    }

    if (!content) return null;

    // If we couldn't get cursor position, return null (fall back to config order)
    if (cursorPos === null) return null;

    const textBeforeCursor = content.substring(0, cursorPos);
    const lineIndex = textBeforeCursor.split("\n").length - 1;
    const lines = content.split("\n");
    const cursorLine = lines[lineIndex] ?? "";

    const match = cursorLine.match(/^([a-zA-Z0-9_-]+)::/);
    if (match) return match[1].toLowerCase();
    return null;
  } catch (error) {
    console.error("[Property Rotator API] getCursorProperty error:", error);
    return null;
  }
}

/**
 * After a property update, move the cursor to just after the :: of that property line.
 * @param uuid - Block UUID
 * @param property - Property name to focus (e.g. "status")
 */
export async function focusPropertyLine(uuid: string, property: string): Promise<void> {
  try {
    const block = await logseq.Editor.getBlock(uuid, { includeChildren: false });
    if (!block?.content) return;

    const lines = block.content.split("\n");
    let charOffset = 0;
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+)::/);
      if (match && match[1].toLowerCase() === property.toLowerCase()) {
        // Position cursor right after "::" (property name length + 2)
        charOffset += match[1].length + 2;
        await logseq.Editor.editBlock(uuid, { pos: charOffset });
        return;
      }
      charOffset += line.length + 1; // +1 for \n
    }
  } catch (error) {
    console.error("[Property Rotator API] focusPropertyLine error:", error);
  }
}

/**
 * Get the currently focused block
 * @returns Current block info or null if none/error
 */
export async function getCurrentBlock(): Promise<BlockInfo | null> {
  try {
    console.log("[PR API] getCurrentBlock: calling logseq.Editor.getCurrentBlock");
    let block = await logseq.Editor.getCurrentBlock();
    console.log("[PR API] getCurrentBlock: getCurrentBlock returned:", block ? block.uuid : null);

    if (!block) {
      console.log("[PR API] getCurrentBlock: trying getSelectedBlocks");
      const selected = await logseq.Editor.getSelectedBlocks();
      console.log("[PR API] getCurrentBlock: getSelectedBlocks returned:", selected?.length ?? 0, "blocks");
      if (selected && selected.length > 0) {
        block = selected[0];
      }
    }

    if (!block) {
      console.log("[PR API] getCurrentBlock: both methods returned null - no block in edit mode");
      return null;
    }

    const freshBlock = await logseq.Editor.getBlock(block.uuid, { includeChildren: false });
    console.log("[PR API] getCurrentBlock: freshBlock content length:", freshBlock?.content?.length ?? 0, "properties:", JSON.stringify(freshBlock?.properties ?? {}));
    return {
      uuid: block.uuid,
      content: (freshBlock?.content ?? block.content) ?? '',
      properties: ((freshBlock?.properties ?? block.properties) as Record<string, string>) || {}
    };
  } catch (error) {
    console.error("[PR API] getCurrentBlock THREW:", error);
    return null;
  }
}

/**
 * Get a specific property value from a block
 * @param blockUuid - Block UUID
 * @param property - Property name
 * @returns Property value string or null if not found/error
 */
export async function getBlockProperty(
  blockUuid: string,
  property: string
): Promise<string | null> {
  try {
    const value = await logseq.Editor.getBlockProperty(blockUuid, property);
    if (value === undefined || value === null) return null;
    return String(value);
  } catch (error) {
    console.error(`getBlockProperty error (${property}):`, error);
    return null;
  }
}

/**
 * Set a property value on a block
 * @param blockUuid - Block UUID
 * @param property - Property name
 * @param value - Property value
 * @returns true if successful, false on error
 */
export async function setBlockProperty(
  blockUuid: string,
  property: string,
  value: string
): Promise<boolean> {
  try {
    console.log("[PR API] setBlockProperty:", property, "=", value, "on block:", blockUuid);
    await logseq.Editor.upsertBlockProperty(blockUuid, property, value);
    console.log("[PR API] setBlockProperty: success");
    return true;
  } catch (error) {
    console.error("[PR API] setBlockProperty THREW:", property, error);
    return false;
  }
}

