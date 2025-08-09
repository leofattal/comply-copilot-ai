const fs = require('fs');
const https = require('https');

const token = fs.readFileSync('/Users/david.fattal/Documents/GitHub/comply-copilot-ai/.cursor/deel_token.txt','utf8').trim();
const hosts = [
  'api-sandbox.demo.deel.com',
  'api.sandbox.deel.com',
  'api-sandbox.deel.com',
  'api.demo.deel.com'
];
const limit = 150;

function get(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = { hostname, path, headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Comply-Copilot-AI/1.0', Accept: 'application/json' } };
    https.get(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Invalid JSON ${hostname}${path}: ${e.message}`)); }
        } else {
          reject(new Error(`${hostname}${path} -> ${res.statusCode}: ${data}`));
        }
      })
    }).on('error', reject);
  });
}

async function countPageMode(hostname, resource) {
  let page = 1; let total = 0;
  while (true) {
    const arr = await get(hostname, `/rest/v2/${resource}?limit=${limit}&page=${page}`);
    if (!Array.isArray(arr) || arr.length === 0) break;
    total += arr.length;
    if (arr.length < limit) break;
    page += 1;
    if (page > 200) break; // safety
  }
  return total;
}

async function countOffsetMode(hostname, resource) {
  let offset = 0; let total = 0;
  while (true) {
    const arr = await get(hostname, `/rest/v2/${resource}?limit=${limit}&offset=${offset}`);
    if (!Array.isArray(arr) || arr.length === 0) break;
    total += arr.length;
    if (arr.length < limit) break;
    offset += arr.length;
    if (offset > 50000) break; // safety
  }
  return total;
}

(async () => {
  const results = [];
  for (const host of hosts) {
    for (const res of ['people','contracts']) {
      for (const mode of ['page','offset']) {
        try {
          const count = mode === 'page' ? await countPageMode(host, res) : await countOffsetMode(host, res);
          results.push({ host: host, resource: res, mode, count });
        } catch (e) {
          results.push({ host: host, resource: res, mode, error: e.message });
        }
      }
    }
  }
  console.log(JSON.stringify(results, null, 2));
})();
