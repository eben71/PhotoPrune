const fsp = require('fs/promises');
const path = require('path');

const { getValidAccessToken, requireEnv } = require('./auth');
const { getMediaItem, createMetrics } = require('./google-photos');
const { fetchWithTimeout } = require('./http');

const RUNS_DIR = path.join(__dirname, '..', 'runs');

function parseArgs(argv) {
  const options = {
    runFile: null,
    tokenId: 'default',
    label: 'T+0',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--run-file':
        options.runFile = argv[i + 1];
        i += 1;
        break;
      case '--token-id':
        options.tokenId = argv[i + 1];
        i += 1;
        break;
      case '--label':
        options.label = argv[i + 1];
        i += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.runFile) {
    throw new Error('--run-file is required');
  }

  return options;
}

async function checkBaseUrl(baseUrl) {
  const start = Date.now();
  const response = await fetchWithTimeout(baseUrl, {
    method: 'GET',
    headers: {
      Range: 'bytes=0-1023',
    },
  });
  const durationMs = Date.now() - start;
  const contentType = response.headers.get('content-type') || '';
  const contentLength = Number(response.headers.get('content-length') || 0);
  const okStatus = response.status === 200 || response.status === 206;
  const okType = contentType.startsWith('image/') || contentType.startsWith('video/');
  const okLength = contentLength > 0;

  return {
    ok: okStatus && okType && okLength,
    status: response.status,
    duration_ms: durationMs,
    content_type: contentType,
    content_length: contentLength,
  };
}

async function run() {
  requireEnv('CLIENT_ID');
  requireEnv('CLIENT_SECRET');
  requireEnv('REDIRECT_URI');

  const options = parseArgs(process.argv.slice(2));
  const runData = JSON.parse(await fsp.readFile(options.runFile, 'utf8'));
  const samples = runData.url_samples || [];

  const metrics = createMetrics();
  const refreshMetrics = {
    attempts: 0,
    success: 0,
    failure: 0,
    total_latency_ms: 0,
  };

  const getAccessToken = ({ forceRefresh = false } = {}) =>
    getValidAccessToken({ tokenId: options.tokenId, metrics, forceRefresh });

  const results = [];
  const statusHistogram = {};
  let totalDuration = 0;

  for (const sample of samples) {
    const result = {
      id: sample.id,
      initial: null,
      refreshed: null,
    };

    const initial = await checkBaseUrl(sample.baseUrl);
    result.initial = initial;
    statusHistogram[initial.status] = (statusHistogram[initial.status] || 0) + 1;
    totalDuration += initial.duration_ms;

    if (!initial.ok) {
      refreshMetrics.attempts += 1;
      const refreshStart = Date.now();
      try {
        const refreshedItem = await getMediaItem({
          getAccessToken,
          metrics,
          mediaItemId: sample.id,
        });
        refreshMetrics.total_latency_ms += Date.now() - refreshStart;
        const refreshedCheck = await checkBaseUrl(refreshedItem.baseUrl);
        result.refreshed = refreshedCheck;
        if (refreshedCheck.ok) {
          refreshMetrics.success += 1;
        } else {
          refreshMetrics.failure += 1;
        }
      } catch (error) {
        refreshMetrics.total_latency_ms += Date.now() - refreshStart;
        refreshMetrics.failure += 1;
        result.refreshed = {
          ok: false,
          error: error.message,
        };
      }
    }

    results.push(result);
  }

  const successes = results.filter((entry) => entry.initial?.ok).length;
  const failures = results.length - successes;
  const runId = `${runData.run_id}-${options.label}`.replace(/\s+/g, '-');
  const outputFile = path.join(
    RUNS_DIR,
    `${runId}-url-check.json`,
  );

  const report = {
    run_id: runData.run_id,
    label: options.label,
    checked_at: new Date().toISOString(),
    sample_count: results.length,
    success_count: successes,
    failure_count: failures,
    status_histogram: statusHistogram,
    avg_response_time_ms: results.length
      ? Math.round((totalDuration / results.length) * 100) / 100
      : 0,
    refresh: {
      attempts: refreshMetrics.attempts,
      success: refreshMetrics.success,
      failure: refreshMetrics.failure,
      avg_latency_ms: refreshMetrics.attempts
        ? Math.round(
            (refreshMetrics.total_latency_ms / refreshMetrics.attempts) * 100,
          ) / 100
        : 0,
    },
    request_metrics: metrics,
    results,
  };

  await fsp.writeFile(outputFile, JSON.stringify(report, null, 2));

  console.log(
    `URL check ${options.label}: ${successes}/${results.length} valid. Output: ${outputFile}`,
  );
}

run().catch((error) => {
  console.error('URL check failed:', error.message);
  process.exitCode = 1;
});
