import { appendFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { loadBuildData, publicPageEntries } from './build-context.mjs';

// This notifier uses only Node's standard library, so the deployment job can
// run it without installing Astro or any other npm dependency.
const endpoint = 'https://searchadvisor.naver.com/indexnow';
const deadline = Date.now() + 55_000;
const remainingTime = () => Math.max(0, deadline - Date.now());
const annotationEscape = value => String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');

async function report(result) {
  console.log(JSON.stringify({ service: 'Naver IndexNow', ...result }, null, 2));
  if (!['submitted', 'dry-run'].includes(result.status)) {
    console.warn(`::warning title=Naver IndexNow ${result.status}::${annotationEscape(result.message)} Pages deployment is a separate result.`);
  }
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `indexnow_status=${result.status}\nindexnow_http_status=${result.httpStatus || ''}\nindexnow_url_count=${result.urlCount || 0}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Naver IndexNow\n\n- Host: ${result.host || 'not available'}\n- Notification status: **${result.status}**\n- URLs: ${result.urlCount || 0}\n- IndexNow HTTP status: ${result.httpStatus || 'no confirmed response'}\n- Public key verified: ${result.keyVerified ? 'yes' : 'no'}\n\n${result.message}\n\nThis is separate from GitHub Pages deployment. A received notification does not establish indexing or search ranking.\n`);
  }
  if (result.status === 'pending') process.exitCode = 2;
  if (result.status === 'failed') process.exitCode = 1;
}

async function request(url, options = {}) {
  const timeout = Math.min(25_000, remainingTime());
  if (timeout < 250) throw new Error('The bounded notification time budget was reached.');
  return fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(timeout) });
}

async function main() {
  const data = loadBuildData();
  const site = data.sites[0];
  const host = new URL(site.baseUrl).hostname;
  const key = site.indexNowKey;
  const keyLocation = new URL(`${key}.txt`, site.baseUrl).href;
  const urlList = [...new Set(publicPageEntries(data).map(entry => new URL(entry.path ? `${entry.path}/` : './', site.baseUrl).href))];
  if (!urlList.length || urlList.length > 10_000) throw new Error('IndexNow requires 1–10,000 page URLs.');
  for (const address of [keyLocation, ...urlList]) {
    const url = new URL(address);
    if (url.protocol !== 'https:' || url.hostname !== host) throw new Error('Every IndexNow URL must use HTTPS on the selected host.');
  }
  const context = { host, urlCount: urlList.length, keyVerified: false };
  if (process.argv.includes('--dry-run')) {
    await report({ ...context, status: 'dry-run', keyLocation, message: 'Validated local configuration only. No network requests or IndexNow submission were made.' });
    return;
  }

  let verified = false;
  let lastKeyStatus;
  let keyReason = 'The public HTTPS key file is not available yet.';
  for (let attempt = 1; attempt <= 3 && remainingTime() > 250; attempt++) {
    try {
      const response = await request(keyLocation, { cache: 'no-store' });
      lastKeyStatus = response.status;
      if (response.status === 429) {
        await response.body?.cancel();
        await report({ ...context, status: 'pending', keyHttpStatus: 429, message: 'The public key host rate-limited the check. No IndexNow POST was sent and no retry will be made in this run.' });
        return;
      }
      if (response.status === 200) {
        const content = await response.text();
        if (content.trim() === key) {
          verified = true;
          break;
        }
        keyReason = 'The public HTTPS key file does not contain the configured key.';
      } else {
        await response.body?.cancel();
        keyReason = `The public HTTPS key file returned HTTP ${response.status}. DNS, certificate provisioning or deployment propagation may still be pending.`;
      }
    } catch (error) {
      keyReason = `The public HTTPS key could not be verified: ${error.message}`;
    }
    if (attempt < 3 && remainingTime() > 5_250) await delay(5_000);
    else break;
  }
  if (!verified || remainingTime() < 250) {
    await report({ ...context, status: 'pending', keyHttpStatus: lastKeyStatus, message: `${keyReason} No IndexNow POST was sent. Retry after the HTTPS site is publicly available.` });
    return;
  }
  context.keyVerified = true;

  try {
    const response = await request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation, urlList }),
    });
    const status = response.status;
    await response.body?.cancel();
    if (status === 200) {
      await report({ ...context, status: 'submitted', httpStatus: status, message: 'Naver received the submitted URLs. Indexing and ranking are not confirmed by this response.' });
    } else if (status === 202) {
      await report({ ...context, status: 'pending', httpStatus: status, message: 'Naver accepted the URLs, but IndexNow key validation is pending. No duplicate POST will be sent in this run.' });
    } else if (status === 429) {
      await report({ ...context, status: 'pending', httpStatus: status, message: 'Naver rate-limited the submission. Stopped after this single POST; no immediate retry will be made.' });
    } else {
      await report({ ...context, status: 'failed', httpStatus: status, message: `Naver returned HTTP ${status}. No duplicate POST was sent. Pages deployment remains a separate result.` });
    }
  } catch (error) {
    await report({ ...context, status: 'pending', message: `The IndexNow response was not confirmed: ${error.message} No duplicate POST was sent.` });
  }
}

try {
  await main();
} catch (error) {
  await report({ status: 'failed', message: `Local IndexNow configuration or notification failed: ${error.message}` });
}
