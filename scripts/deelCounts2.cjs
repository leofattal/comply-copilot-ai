const fs = require('fs');
const https = require('https');

const token = fs.readFileSync('/Users/david.fattal/Documents/GitHub/comply-copilot-ai/.cursor/deel_token.txt','utf8').trim();
const baseHost = 'api-sandbox.demo.deel.com';
const limit = 150;

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: baseHost,
      path,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Comply-Copilot-AI/1.0',
        'Accept': 'application/json'
      }
    };

    https.get(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error(`Invalid JSON for ${path}: ${e.message}`));
          }
        } else {
          reject(new Error(`${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function countResource(resource) {
  let offset = 0;
  let total = 0;
  while (true) {
    const separator = resource.includes('?') ? '&' : '?';
    const path = `/rest/v2/${resource}${separator}limit=${limit}&offset=${offset}`;
    const page = await get(path);

    let items = Array.isArray(page) ? page : (Array.isArray(page?.data) ? page.data : []);
    if (!items.length) break;

    total += items.length;
    if (items.length < limit) break;
    offset += items.length;

    if (offset > 20000) break; // safety cap
    // small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 150));
  }
  return total;
}

(async () => {
  const [people, contracts] = await Promise.all([
    countResource('people'),
    countResource('contracts')
  ]);
  console.log(JSON.stringify({ people, contracts }));
})().catch(err => { console.error(err.message); process.exit(1); });
