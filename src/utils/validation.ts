/**
 * Input validation utilities for Property Rotator plugin
 * This module provides validation functions for user inputs
 * Contract: Pure validation functions that return boolean results
 */

import { RotationConfig } from '../types';

/**
 * Validate if a string is a valid property name
 * @param property - Property name to validate
 * @returns true if valid, false otherwise
 */
export function isValidPropertyName(property: string): boolean {
  if (!property || typeof property !== 'string') {
    return false;
  }
  
  // Property names should be alphanumeric with hyphens and underscores
  return /^[a-zA-Z0-9_-]+$/.test(property);
}

/**
 * Validate if a string is a valid term
 * @param term - Term to validate
 * @returns true if valid, false otherwise
 */
export function isValidTerm(term: string): boolean {
  if (!term || typeof term !== 'string') {
    return false;
  }
  
  // Terms should be non-empty strings
  return term.trim().length > 0;
}

/**
 * Validate if an array contains valid terms
 * @param terms - Array of terms to validate
 * @returns true if all terms are valid, false otherwise
 */
export function isValidTermsArray(terms: string[]): boolean {
  if (!Array.isArray(terms) || terms.length === 0) {
    return false;
  }
  
  return terms.every(isValidTerm);
}

/**
 * Validate rotation configuration with detailed error reporting
 * @param config - Rotation configuration to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateRotationConfigDetailed(
  config: RotationConfig
): { isValid: boolean; error?: string } {
  if (!config.property || typeof config.property !== 'string') {
    return { isValid: false, error: 'Property name is required and must be a string' };
  }
  
  if (!isValidPropertyName(config.property)) {
    return { isValid: false, error: 'Invalid property name format' };
  }
  
  if (!Array.isArray(config.terms) || config.terms.length === 0) {
    return { isValid: false, error: 'Terms must be a non-empty array' };
  }
  
  if (!isValidTermsArray(config.terms)) {
    return { isValid: false, error: 'All terms must be non-empty strings' };
  }
  
  if (config.subRotations) {
    for (const key in config.subRotations) {
      if (!config.terms.includes(key)) {
        return { isValid: false, error: `Sub-rotation key "${key}" must be in terms array` };
      }
      
      if (!Array.isArray(config.subRotations[key]) || config.subRotations[key].length === 0) {
        return { isValid: false, error: `Sub-rotation for "${key}" must be a non-empty array` };
      }
      
      if (!isValidTermsArray(config.subRotations[key])) {
        return { isValid: false, error: `All sub-terms for "${key}" must be non-empty strings` };
      }
    }
  }
  
  return { isValid: true };
}
