import { EnvironmentConfig, getEnvironment } from './environments';

export type LoadProfile = 'fixed' | 'ramp-up' | 'spike' | 'peak';

export type RuntimeConfig = {
  environment: EnvironmentConfig;
  loadProfile: LoadProfile;
  initialUsers: number;
  users: number;
  durationSeconds: number;
};

function envValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = __ENV[name];
    if (value !== undefined && value !== '') {
      return value;
    }
  }

  return undefined;
}

function numberValue(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function loadProfileValue(value: string | undefined): LoadProfile {
  const normalizedValue = (value || 'fixed').toLowerCase();

  if (normalizedValue === 'ramp-up' || normalizedValue === 'spike' || normalizedValue === 'peak') {
    return normalizedValue;
  }

  return 'fixed';
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    environment: getEnvironment(envValue('ENV', 'env'), envValue('BASE_URL', 'baseUrl')),
    loadProfile: loadProfileValue(envValue('LOAD_PROFILE', 'loadProfile')),
    initialUsers: numberValue(envValue('INITIAL_USERS', 'initialUsers'), 1),
    users: numberValue(envValue('USERS', 'users'), 10),
    durationSeconds: numberValue(envValue('DURATION_SECONDS', 'durationSeconds'), 60)
  };
}
