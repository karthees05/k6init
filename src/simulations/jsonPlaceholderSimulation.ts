import { Options } from 'k6/options';
import { getRuntimeConfig } from '../config/runtime';
import { buildOptions } from '../core/loadProfiles';
import { fullJsonPlaceholderJourney } from '../journeys/apiJourneys';

const runtimeConfig = getRuntimeConfig();

export const options: Options = buildOptions(runtimeConfig);

export function jsonPlaceholderJourney(): void {
  fullJsonPlaceholderJourney({
    baseUrl: runtimeConfig.environment.baseUrl
  });
}

export default function (): void {
  jsonPlaceholderJourney();
}

type K6Summary = {
  metrics?: Record<string, { values?: Record<string, number>; thresholds?: Record<string, { ok: boolean }> }>;
  root_group?: {
    checks?: Array<{ name: string; passes: number; fails: number }>;
    groups?: Array<{ name: string; checks?: Array<{ name: string; passes: number; fails: number }> }>;
  };
};

function value(summary: K6Summary, metric: string, name: string): string {
  const metricValue = summary.metrics?.[metric]?.values?.[name];
  return metricValue === undefined ? 'n/a' : String(metricValue);
}

function thresholdStatus(summary: K6Summary): string {
  const thresholds: string[] = [];

  for (const [metric, metricSummary] of Object.entries(summary.metrics || {})) {
    for (const [threshold, result] of Object.entries(metricSummary.thresholds || {})) {
      thresholds.push(`${metric} ${threshold}: ${result.ok ? 'PASS' : 'FAIL'}`);
    }
  }

  return thresholds.length > 0 ? thresholds.join('\n') : 'No thresholds configured';
}

function summaryText(summary: K6Summary): string {
  return [
    'K6 summary',
    `http_reqs count: ${value(summary, 'http_reqs', 'count')}`,
    `http_req_failed rate: ${value(summary, 'http_req_failed', 'rate')}`,
    `http_req_duration avg: ${value(summary, 'http_req_duration', 'avg')} ms`,
    `http_req_duration p(95): ${value(summary, 'http_req_duration', 'p(95)')} ms`,
    `http_req_duration p(99): ${value(summary, 'http_req_duration', 'p(99)')} ms`,
    '',
    thresholdStatus(summary)
  ].join('\n');
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function numberMetric(summary: K6Summary, metric: string, name: string): number | undefined {
  return summary.metrics?.[metric]?.values?.[name];
}

function formatNumber(value: number | undefined, suffix = ''): string {
  if (value === undefined) {
    return 'n/a';
  }

  return `${Number(value.toFixed(2)).toLocaleString()}${suffix}`;
}

function formatRate(value: number | undefined): string {
  if (value === undefined) {
    return 'n/a';
  }

  return `${Number((value * 100).toFixed(2)).toLocaleString()}%`;
}

function thresholdRows(summary: K6Summary): string {
  const rows: string[] = [];

  for (const [metric, metricSummary] of Object.entries(summary.metrics || {})) {
    for (const [threshold, result] of Object.entries(metricSummary.thresholds || {})) {
      rows.push(`
        <tr>
          <td>${htmlEscape(metric)}</td>
          <td><code>${htmlEscape(threshold)}</code></td>
          <td><span class="pill ${result.ok ? 'pass' : 'fail'}">${result.ok ? 'PASS' : 'FAIL'}</span></td>
        </tr>
      `);
    }
  }

  return rows.join('') || '<tr><td colspan="3">No thresholds configured</td></tr>';
}

function metricRows(summary: K6Summary): string {
  const metrics = [
    'http_reqs',
    'http_req_failed',
    'http_req_duration',
    'http_req_waiting',
    'http_req_connecting',
    'http_req_tls_handshaking',
    'iteration_duration',
    'iterations',
    'vus',
    'vus_max',
    'data_received',
    'data_sent'
  ];

  return metrics
    .filter((metric) => summary.metrics?.[metric])
    .map((metric) => {
      const values = summary.metrics?.[metric]?.values || {};

      return `
        <tr>
          <td>${htmlEscape(metric)}</td>
          <td>${formatNumber(values.count)}</td>
          <td>${formatNumber(values.rate)}</td>
          <td>${formatNumber(values.avg)}</td>
          <td>${formatNumber(values.min)}</td>
          <td>${formatNumber(values.med)}</td>
          <td>${formatNumber(values['p(90)'])}</td>
          <td>${formatNumber(values['p(95)'])}</td>
          <td>${formatNumber(values['p(99)'])}</td>
          <td>${formatNumber(values.max)}</td>
        </tr>
      `;
    })
    .join('');
}

function checkRows(summary: K6Summary): string {
  const checks = [
    ...(summary.root_group?.checks || []),
    ...(summary.root_group?.groups || []).flatMap((group) => group.checks || [])
  ];

  if (checks.length === 0) {
    return '<tr><td colspan="4">No checks reported</td></tr>';
  }

  return checks
    .map((check) => {
      const total = check.passes + check.fails;
      const successRate = total === 0 ? 0 : check.passes / total;

      return `
        <tr>
          <td>${htmlEscape(check.name)}</td>
          <td>${check.passes.toLocaleString()}</td>
          <td>${check.fails.toLocaleString()}</td>
          <td>${formatRate(successRate)}</td>
        </tr>
      `;
    })
    .join('');
}

function htmlSummary(summary: K6Summary): string {
  const failedRate = numberMetric(summary, 'http_req_failed', 'rate');
  const totalRequests = numberMetric(summary, 'http_reqs', 'count');
  const requestsPerSecond = numberMetric(summary, 'http_reqs', 'rate');
  const avgDuration = numberMetric(summary, 'http_req_duration', 'avg');
  const p95Duration = numberMetric(summary, 'http_req_duration', 'p(95)');
  const p99Duration = numberMetric(summary, 'http_req_duration', 'p(99)');
  const generatedAt = new Date().toISOString();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K6 Performance Test Report</title>
  <style>
    :root {
      color: #172026;
      background: #f6f8fb;
      font-family: Arial, Helvetica, sans-serif;
    }
    body {
      margin: 0;
      background: #f6f8fb;
    }
    header {
      background: #172026;
      color: #ffffff;
      padding: 28px 40px;
    }
    header h1 {
      margin: 0 0 8px;
      font-size: 28px;
      font-weight: 700;
    }
    header p {
      margin: 0;
      color: #c9d4df;
    }
    main {
      padding: 28px 40px 40px;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #dce3ea;
      border-radius: 8px;
      padding: 18px;
    }
    .label {
      color: #657383;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .value {
      margin-top: 10px;
      font-size: 26px;
      font-weight: 700;
    }
    section {
      margin-top: 28px;
    }
    h2 {
      font-size: 20px;
      margin: 0 0 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border: 1px solid #dce3ea;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      border-bottom: 1px solid #e7edf3;
      padding: 11px 12px;
      text-align: left;
      font-size: 14px;
    }
    th {
      background: #eef3f7;
      color: #3c4a57;
      font-weight: 700;
    }
    tr:last-child td {
      border-bottom: 0;
    }
    code {
      background: #eef3f7;
      border-radius: 4px;
      padding: 2px 5px;
    }
    .pill {
      display: inline-block;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 8px;
    }
    .pass {
      background: #dcfce7;
      color: #166534;
    }
    .fail {
      background: #fee2e2;
      color: #991b1b;
    }
    @media (max-width: 760px) {
      header, main {
        padding-left: 18px;
        padding-right: 18px;
      }
      table {
        display: block;
        overflow-x: auto;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>K6 Performance Test Report</h1>
    <p>Generated at ${htmlEscape(generatedAt)}</p>
  </header>
  <main>
    <div class="cards">
      <div class="card"><div class="label">Total Requests</div><div class="value">${formatNumber(totalRequests)}</div></div>
      <div class="card"><div class="label">Requests/sec</div><div class="value">${formatNumber(requestsPerSecond)}</div></div>
      <div class="card"><div class="label">Failure Rate</div><div class="value">${formatRate(failedRate)}</div></div>
      <div class="card"><div class="label">Average Duration</div><div class="value">${formatNumber(avgDuration, ' ms')}</div></div>
      <div class="card"><div class="label">P95 Duration</div><div class="value">${formatNumber(p95Duration, ' ms')}</div></div>
      <div class="card"><div class="label">P99 Duration</div><div class="value">${formatNumber(p99Duration, ' ms')}</div></div>
    </div>

    <section>
      <h2>Thresholds</h2>
      <table>
        <thead><tr><th>Metric</th><th>Threshold</th><th>Status</th></tr></thead>
        <tbody>${thresholdRows(summary)}</tbody>
      </table>
    </section>

    <section>
      <h2>Checks</h2>
      <table>
        <thead><tr><th>Check</th><th>Passes</th><th>Fails</th><th>Success Rate</th></tr></thead>
        <tbody>${checkRows(summary)}</tbody>
      </table>
    </section>

    <section>
      <h2>Metrics</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th><th>Count</th><th>Rate</th><th>Avg</th><th>Min</th><th>Median</th><th>P90</th><th>P95</th><th>P99</th><th>Max</th>
          </tr>
        </thead>
        <tbody>${metricRows(summary)}</tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

export function handleSummary(data: K6Summary): Record<string, string> {
  return {
    stdout: summaryText(data),
    'k6-summary.json': JSON.stringify(data, null, 2),
    'k6-summary.html': htmlSummary(data)
  };
}
