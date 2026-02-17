export type Phase21RunMode = 'engine' | 'fixture';

const DEFAULT_DEV_RUN_MODE: Phase21RunMode = 'engine';

function isDevRuntime() {
  return process.env.NODE_ENV !== 'production';
}

export function getPhase21RunMode(): Phase21RunMode {
  const configured =
    process.env.NEXT_PUBLIC_PHASE2_RUN_MODE?.trim().toLowerCase();

  if (configured === 'fixture') {
    return 'fixture';
  }
  if (configured === 'engine') {
    return 'engine';
  }

  if (isDevRuntime()) {
    return DEFAULT_DEV_RUN_MODE;
  }

  return 'engine';
}

export function shouldUsePhase21FixtureMode(): boolean {
  return isDevRuntime() && getPhase21RunMode() === 'fixture';
}
