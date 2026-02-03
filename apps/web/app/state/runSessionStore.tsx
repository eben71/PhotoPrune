'use client';

import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import type { PickerItem, RunEnvelope } from '../../src/types/phase2Envelope';

const SESSION_KEY = 'photoprune-session-v2';

type RunSummary = RunEnvelope['run'];
type ProgressSummary = RunEnvelope['progress'];
type TelemetrySummary = RunEnvelope['telemetry'];
type ResultsSummary = RunEnvelope['results'];

type RunSessionState = {
  selection: PickerItem[];
  run: RunSummary | null;
  progress: ProgressSummary | null;
  telemetry: TelemetrySummary | null;
  results: ResultsSummary | null;
};

type RunSessionContextValue = {
  state: RunSessionState;
  hydrated: boolean;
  setSelection: (selection: PickerItem[]) => void;
  clearSelection: () => void;
  applyEnvelope: (envelope: RunEnvelope) => void;
  clearResults: () => void;
};

const defaultState: RunSessionState = {
  selection: [],
  run: null,
  progress: null,
  telemetry: null,
  results: null
};

const isDefaultState = (state: RunSessionState) =>
  state.selection.length === 0 &&
  state.run === null &&
  state.progress === null &&
  state.telemetry === null &&
  state.results === null;

const RunSessionContext = createContext<RunSessionContextValue | undefined>(
  undefined
);

function loadSessionState(): RunSessionState {
  if (typeof window === 'undefined') {
    return defaultState;
  }
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) {
    return defaultState;
  }
  try {
    const parsed = JSON.parse(stored) as RunSessionState;
    return {
      ...defaultState,
      ...parsed
    };
  } catch {
    return defaultState;
  }
}

export function RunSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RunSessionState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadSessionState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (isDefaultState(state)) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const setSelection = useCallback((selection: PickerItem[]) => {
    setState((prev) => ({
      ...prev,
      selection,
      run: null,
      progress: null,
      telemetry: null,
      results: null
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(defaultState);
  }, []);

  const applyEnvelope = useCallback((envelope: RunEnvelope) => {
    setState((prev) => ({
      ...prev,
      run: envelope.run,
      progress: envelope.progress,
      telemetry: envelope.telemetry,
      results:
        envelope.run.status === 'COMPLETED' ? envelope.results : prev.results
    }));
  }, []);

  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      run: null,
      progress: null,
      telemetry: null,
      results: null
    }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      setSelection,
      clearSelection,
      applyEnvelope,
      clearResults
    }),
    [state, hydrated, setSelection, clearSelection, applyEnvelope, clearResults]
  );

  return (
    <RunSessionContext.Provider value={value}>
      {children}
    </RunSessionContext.Provider>
  );
}

export function useRunSession() {
  const context = useContext(RunSessionContext);
  if (!context) {
    throw new Error('useRunSession must be used within RunSessionProvider');
  }
  return context;
}
