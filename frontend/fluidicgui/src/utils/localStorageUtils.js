import React, { useState } from 'react';

/**
 * Utility functions for working with localStorage
 */

/**
 * Save data to localStorage with the given key
 * @param {string} key - The localStorage key
 * @param {any} data - The data to save (will be JSON stringified)
 * @returns {boolean} - Whether the save was successful
 */
export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`Data saved to localStorage with key: ${key}`);
    return true;
  } catch (err) {
    console.error(`Error saving to localStorage (key: ${key}):`, err);
    return false;
  }
};

/**
 * Load data from localStorage with the given key
 * @param {string} key - The localStorage key
 * @param {any} defaultValue - Default value if nothing is found
 * @returns {any} - The parsed data or defaultValue if not found
 */
export const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const savedData = localStorage.getItem(key);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      console.log(`Data loaded from localStorage with key: ${key}`);
      return parsedData;
    }
  } catch (err) {
    console.error(`Error loading from localStorage (key: ${key}):`, err);
  }
  return defaultValue;
};

/**
 * Create a React hook for persisting state in localStorage
 * @param {string} key - The localStorage key
 * @param {any} initialValue - Initial value if nothing in localStorage
 * @returns {Array} - [value, setValue] stateful value that syncs with localStorage
 */
export const useLocalStorage = (key, initialValue) => {
  // Load initial state from localStorage
  const loadState = () => {
    return loadFromLocalStorage(key, initialValue);
  };

  // State to store our value
  const [storedValue, setStoredValue] = useState(loadState);

  // Return a wrapped version of useState's setter function
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      saveToLocalStorage(key, valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage value (key: ${key}):`, error);
    }
  };

  return [storedValue, setValue];
}; 