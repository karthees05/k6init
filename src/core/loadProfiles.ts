import { Options } from 'k6/options';
import { RuntimeConfig } from '../config/runtime';

function seconds(value: number): string {
  return `${Math.max(1, Math.round(value))}s`;
}

export function buildOptions(config: RuntimeConfig): Options {
  const baseOptions: Options = {
    thresholds: {
      http_req_failed: ['rate<0.01'],
      http_req_duration: ['p(95)<1000', 'p(99)<2000']
    },
    tags: {
      environment: config.environment.name,
      loadProfile: config.loadProfile,
      initialUsers: String(config.initialUsers),
      users: String(config.users)
    }
  };

  if (config.loadProfile === 'ramp-up') {
    return {
      ...baseOptions,
      scenarios: {
        api_journey: {
          executor: 'ramping-vus',
          startVUs: config.initialUsers,
          stages: [{ target: config.users, duration: seconds(config.durationSeconds) }],
          gracefulRampDown: '10s',
          exec: 'jsonPlaceholderJourney'
        }
      }
    };
  }

  if (config.loadProfile === 'spike') {
    return {
      ...baseOptions,
      scenarios: {
        api_journey: {
          executor: 'ramping-vus',
          startVUs: config.initialUsers,
          stages: [
            { target: config.initialUsers, duration: seconds(config.durationSeconds * 0.2) },
            { target: config.users, duration: seconds(config.durationSeconds * 0.1) },
            { target: config.users, duration: seconds(config.durationSeconds * 0.6) },
            { target: config.initialUsers, duration: seconds(config.durationSeconds * 0.1) }
          ],
          gracefulRampDown: '10s',
          exec: 'jsonPlaceholderJourney'
        }
      }
    };
  }

  if (config.loadProfile === 'peak') {
    return {
      ...baseOptions,
      scenarios: {
        api_journey: {
          executor: 'ramping-vus',
          startVUs: config.initialUsers,
          stages: [
            { target: config.users, duration: seconds(config.durationSeconds * 0.25) },
            { target: config.users, duration: seconds(config.durationSeconds * 0.5) },
            { target: config.initialUsers, duration: seconds(config.durationSeconds * 0.25) }
          ],
          gracefulRampDown: '10s',
          exec: 'jsonPlaceholderJourney'
        }
      }
    };
  }

  return {
    ...baseOptions,
    scenarios: {
      api_journey: {
        executor: 'constant-vus',
        vus: config.users,
        duration: seconds(config.durationSeconds),
        gracefulStop: '10s',
        exec: 'jsonPlaceholderJourney'
      }
    }
  };
}
