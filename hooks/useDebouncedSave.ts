"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SaveStatus } from "@/components/ui/SaveIndicator";

/**
 * useDebouncedSave — Custom hook for inline editing with debounced saves.
 * 
 * @param initialValue - Initial value of the field
 * @param saveFn - Async function to persist the value
 * @param delay - Debounce delay in ms (default 800)
 * 
 * @returns { value, setValue, saveStatus, flush }
 */
export function useDebouncedSave(
  initialValue: string,
  saveFn: (value: string) => Promise<void>,
  delay: number = 800
) {
  const [value, setValueState] = useState(initialValue);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  const lastSavedRef = useRef(initialValue);

  // Keep saveFn ref up to date
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  // Sync with external value changes (e.g. from a refetch)
  useEffect(() => {
    if (initialValue !== lastSavedRef.current) {
      setValueState(initialValue);
      lastSavedRef.current = initialValue;
    }
  }, [initialValue]);

  const debouncedSave = useCallback(async (newValue: string) => {
    if (newValue === lastSavedRef.current) return;
    
    setSaveStatus("saving");
    try {
      await saveFnRef.current(newValue);
      lastSavedRef.current = newValue;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, []);

  const setValue = useCallback((newValue: string) => {
    setValueState(newValue);
    
    // Clear existing timer
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Set new timer
    timerRef.current = setTimeout(() => {
      debouncedSave(newValue);
    }, delay);
  }, [delay, debouncedSave]);

  // Flush immediately (e.g. on blur)
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    debouncedSave(value);
  }, [value, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { value, setValue, saveStatus, flush };
}
