#!/usr/bin/env node

const { spawnSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const choices = {
  environment: ['dev', 'qa', 'prod'],
  loadProfile: ['fixed', 'ramp-up', 'spike', 'peak']
};

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

async function choice(name, defaultValue) {
  const allowedValues = choices[name];

  while (true) {
    const answer = await question(`${name} (${allowedValues.join('/')}) [${defaultValue}]: `);
    const value = answer || defaultValue;

    if (allowedValues.includes(value)) {
      return value;
    }

    console.log(`Invalid ${name}. Use one of: ${allowedValues.join(', ')}`);
  }
}

async function positiveNumber(name, defaultValue, maxValue) {
  while (true) {
    const answer = await question(`${name} [${defaultValue}]: `);
    const value = answer || String(defaultValue);
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue) && parsedValue > 0 && (maxValue === undefined || parsedValue <= maxValue)) {
      return String(Math.round(parsedValue));
    }

    const maxMessage = maxValue === undefined ? '' : ` and must be less than or equal to ${maxValue}`;
    console.log(`${name} must be a positive number${maxMessage}.`);
  }
}

async function optionalText(name, defaultValue) {
  const answer = await question(`${name} [${defaultValue || 'none'}]: `);
  return answer || defaultValue;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function main() {
  const environment = await choice('environment', 'dev');
  const loadProfile = await choice('loadProfile', 'fixed');
  const usersLabel = loadProfile === 'fixed' ? 'users' : 'targetUsers';
  const users = await positiveNumber(usersLabel, loadProfile === 'fixed' ? 5 : 20);
  const durationSeconds = await positiveNumber('durationSeconds', 30);
  const baseUrl = await optionalText('baseUrl override', '');
  const args = ['run', 'dist/jsonPlaceholderSimulation.js'];

  args.push('-e', `ENV=${environment}`);
  args.push('-e', `LOAD_PROFILE=${loadProfile}`);
  args.push('-e', `USERS=${users}`);
  args.push('-e', `DURATION_SECONDS=${durationSeconds}`);

  if (loadProfile !== 'fixed') {
    const initialUsers = await positiveNumber('initialUsers', 1, Number(users));
    args.push('-e', `INITIAL_USERS=${initialUsers}`);
  }

  if (baseUrl) {
    args.push('-e', `BASE_URL=${baseUrl}`);
  }

  rl.close();

  run('npm', ['run', 'build']);
  run('k6', args);
}

main().catch((error) => {
  rl.close();
  console.error(error);
  process.exit(1);
});
