/**
 * Core rotation logic for Property Rotator plugin
 * This module handles the actual property value rotation
 * Contract: Input: currentValue + config, Output: rotated value
 * Pure function with no side effects for easy testing
 */

import { RotationConfig } from './types';

/**
 * Rotate a property value based on configuration
 * @param currentValue - Current property value (can be null/empty)
 * @param config - Rotation configuration
 * @param useSubRotation - Whether to use sub-rotation if available
 * @returns Rotated property value
 */
export function rotateProperty(
  currentValue: string | null,
  config: RotationConfig,
  useSubRotation: boolean = false
): string | null {
  const terms = config.terms;

  if (!currentValue || currentValue.trim() === '') return terms[0];

  const currentTerms = currentValue.split(/[,\/]/).map(t => t.trim()).filter(Boolean);

  const matchedTerm = terms.find(term =>
    currentTerms.some(ct => ct.toLowerCase() === term.toLowerCase())
  );

  if (!matchedTerm) return terms[0];

  if (useSubRotation) {
    const subTerms = config.subRotations?.[matchedTerm];
    if (subTerms && subTerms.length > 0) return handleSubRotation(currentTerms, matchedTerm, subTerms);
    return null;
  }

  return handleMainRotation(currentTerms, matchedTerm, terms, config.subRotations || {});
}

/**
 * Handle main term rotation
 * @param currentTerms - Array of current terms
 * @param matchedTerm - The term that matched our config
 * @param terms - Array of terms to rotate through
 * @returns New property value with rotated term
 */
function handleMainRotation(
  currentTerms: string[],
  matchedTerm: string,
  terms: string[],
  subRotations: Record<string, string[]>
): string {
  const currentIndex = terms.indexOf(matchedTerm);
  const nextTerm = terms[(currentIndex + 1) % terms.length];

  const allSubTerms = new Set<string>();
  for (const subs of Object.values(subRotations)) {
    for (const s of subs) allSubTerms.add(s.toLowerCase());
  }

  const newTerms = currentTerms
    .filter(t => !allSubTerms.has(t.toLowerCase()))
    .map(t => t.toLowerCase() === matchedTerm.toLowerCase() ? nextTerm : t);

  return newTerms.join('/');
}

/**
 * Handle sub-term rotation
 * @param currentTerms - Array of current terms
 * @param matchedTerm - The main term that matched
 * @param subTerms - Array of sub-terms to rotate through
 * @returns New property value with rotated sub-term
 */
function handleSubRotation(
  currentTerms: string[],
  _matchedTerm: string,
  subTerms: string[]
): string {
  const currentSubTerm = currentTerms.find(ct => subTerms.includes(ct));

  if (currentSubTerm) {
    const nextSubIndex = (subTerms.indexOf(currentSubTerm) + 1) % subTerms.length;
    return currentTerms.map(t => subTerms.includes(t) ? subTerms[nextSubIndex] : t).join('/');
  }

  return [...currentTerms, subTerms[0]].join('/');
}
