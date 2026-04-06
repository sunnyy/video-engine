/**
 * useUserRules.js
 * Global user-defined AI rules stored in localStorage.
 * Shape: { do: string[], dont: string[] }
 */
import { useState, useCallback } from "react";

const STORAGE_KEY = "ve_user_rules";
const MAX_RULES   = 10;
const MAX_CHARS   = 120;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { do: [], dont: [] };
    const parsed = JSON.parse(raw);
    return {
      do:   Array.isArray(parsed.do)   ? parsed.do   : [],
      dont: Array.isArray(parsed.dont) ? parsed.dont : [],
    };
  } catch {
    return { do: [], dont: [] };
  }
}

function save(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function useUserRules() {
  const [rules, setRules] = useState(load);

  const addRule = useCallback((type, text) => {
    const trimmed = text.trim().slice(0, MAX_CHARS);
    if (!trimmed) return;
    setRules(prev => {
      if (prev[type].length >= MAX_RULES) return prev;
      const next = { ...prev, [type]: [...prev[type], trimmed] };
      save(next);
      return next;
    });
  }, []);

  const removeRule = useCallback((type, index) => {
    setRules(prev => {
      const next = { ...prev, [type]: prev[type].filter((_, i) => i !== index) };
      save(next);
      return next;
    });
  }, []);

  const updateRule = useCallback((type, index, text) => {
    const trimmed = text.slice(0, MAX_CHARS);
    setRules(prev => {
      const list = [...prev[type]];
      list[index] = trimmed;
      const next = { ...prev, [type]: list };
      save(next);
      return next;
    });
  }, []);

  return { rules, addRule, removeRule, updateRule, MAX_RULES, MAX_CHARS };
}

/** Pure helper — read rules once for use outside React (e.g. in buildPrompt) */
export function getUserRules() {
  return load();
}
