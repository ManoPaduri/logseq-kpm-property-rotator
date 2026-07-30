/**
 * Logseq API wrapper for Property Rotator plugin
 * This module wraps all Logseq API calls with consistent error handling
 * Contract: All functions return null/false on error, never throw
 */

import "@logseq/libs";
import { BlockInfo } from '../types';

/** Last UUID known to be in edit mode — updated by onInputSelectionEnd in main.ts */
let _lastEditingUuid: string | null = null;

export function setLastKnownEditingUuid(uuid: string | null): void {
  _lastEditingUuid = uuid;
}

/**
 * Detect which property name the cursor is currently on.
 * Returns the property name (e.g. "location") if cursor is on a "key:: value" line,
 * or null if cursor is on the block content line or not in editor.
 */
export async function getCursorProperty(): Promise<string | null> {
  try {
    // Use Logseq's official APIs — cross-origin safe, works under the global shortcut.
    const content = await logseq.Editor.getEditingBlockContent();
    if (!content) {
      console.log("[PR API] getCursorProperty: no editing content (not in edit mode)");
      return null;
    }

    const cursor = await logseq.Editor.getEditingCursorPosition();
    console.log("[PR API] getCursorProperty: cursor pos:", cursor?.pos ?? null, "contentLen:", content.length);
    if (!cursor || typeof cursor.pos !== "number") return null;

    const cursorPos = cursor.pos;
    const textBeforeCursor = content.substring(0, cursorPos);
    const lineIndex = textBeforeCursor.split("\n").length - 1;
    const lines = content.split("\n");
    const cursorLine = lines[lineIndex] ?? "";
    console.log("[PR API] getCursorProperty: lineIndex:", lineIndex, "cursorLine:", JSON.stringify(cursorLine));

    const match = cursorLine.match(/^([a-zA-Z0-9_-]+)::/);
    if (match) {
      console.log("[PR API] getCursorProperty: detected property:", match[1].toLowerCase());
      return match[1].toLowerCase();
    }
    return null;
  } catch (error) {
    console.error("[PR API] getCursorProperty THREW:", error);
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
    // Step 1: checkEditing() — returns UUID of actively editing block (works with global mode shortcuts)
    // This is the key pattern used by working plugins like cycle-todo-dwim
    console.log("[PR API] getCurrentBlock: calling logseq.Editor.checkEditing");
    const editingUuid = await logseq.Editor.checkEditing();
    console.log("[PR API] getCurrentBlock: checkEditing returned:", editingUuid);

    if (editingUuid && typeof editingUuid === "string") {
      console.log("[PR API] getCurrentBlock: fetching editing block by uuid:", editingUuid);
      const editingBlock = await logseq.Editor.getBlock(editingUuid, { includeChildren: false });
      // Override content with live editing content (ahead of Logseq save process)
      const liveContent = await logseq.Editor.getEditingBlockContent();
      console.log("[PR API] getCurrentBlock: editingBlock uuid:", editingBlock?.uuid, "liveContent length:", liveContent?.length ?? 0, "properties:", JSON.stringify(editingBlock?.properties ?? {}));
      if (editingBlock) {
        return {
          uuid: editingBlock.uuid,
          content: liveContent ?? editingBlock.content ?? '',
          properties: (editingBlock.properties as Record<string, string>) || {}
        };
      }
    }

    // Step 2: fall back to getCurrentBlock()
    console.log("[PR API] getCurrentBlock: checkEditing null, trying getCurrentBlock");
    let block = await logseq.Editor.getCurrentBlock();
    console.log("[PR API] getCurrentBlock: getCurrentBlock returned:", block ? block.uuid : null);

    if (!block) {
      // Step 3: fall back to selected blocks
      console.log("[PR API] getCurrentBlock: trying getSelectedBlocks");
      const selected = await logseq.Editor.getSelectedBlocks();
      console.log("[PR API] getCurrentBlock: getSelectedBlocks returned:", selected?.length ?? 0, "blocks");
      if (selected && selected.length > 0) {
        block = selected[0];
      }
    }

    if (!block) {
      // Step 4: fall back to last known editing UUID (covers toolbar click which exits edit mode)
      if (_lastEditingUuid) {
        console.log("[PR API] getCurrentBlock: using lastEditingUuid fallback:", _lastEditingUuid);
        const fallbackBlock = await logseq.Editor.getBlock(_lastEditingUuid, { includeChildren: false });
        if (fallbackBlock) {
          return {
            uuid: fallbackBlock.uuid,
            content: fallbackBlock.content ?? '',
            properties: (fallbackBlock.properties as Record<string, string>) || {}
          };
        }
      }
      console.log("[PR API] getCurrentBlock: all methods returned null - no block in edit/selected mode");
      return null;
    }

    const freshBlock = await logseq.Editor.getBlock(block.uuid, { includeChildren: false });
    console.log("[PR API] getCurrentBlock: freshBlock uuid:", freshBlock?.uuid, "content length:", freshBlock?.content?.length ?? 0, "properties:", JSON.stringify(freshBlock?.properties ?? {}));
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

