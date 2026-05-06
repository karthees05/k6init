export type EnvironmentName = 'dev' | 'qa' | 'prod';

export type EnvironmentConfig = {
  name: EnvironmentName;
  baseUrl: string;
};

const environments: Record<EnvironmentName, EnvironmentConfig> = {
  dev: {
    name: 'dev',
    baseUrl: 'https://jsonplaceholder.typicode.com'
  },
  qa: {
    name: 'qa',
    baseUrl: 'https://jsonplaceholder.typicode.com'
  },
  prod: {
    name: 'prod',
    baseUrl: 'https://jsonplaceholder.typicode.com'
  }
};

export function getEnvironment(name: string | undefined, baseUrlOverride?: string): EnvironmentConfig {
  const normalizedName = (name || 'dev').toLowerCase() as EnvironmentName;
  const environment = environments[normalizedName] || environments.dev;

  return {
    ...environment,
    baseUrl: baseUrlOverride || environment.baseUrl
  };
}
