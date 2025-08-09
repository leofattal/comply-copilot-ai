const fs = require('fs');
const https = require('https');

const tokenPath = '/Users/david.fattal/Documents/GitHub/comply-copilot-ai/.cursor/deel_token.txt';
const token = fs.readFileSync(tokenPath, 'utf8').trim();
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
        'User-Agent': 'Comply-Copilot-AI/1.0'
      }
    };

    https.get(options, res => {
      let data = '';
      res.on('data', d => (data += d));
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
  let page = 1;
  let total = 0;
  while (true) {
    const path = `/rest/v2/${resource}?limit=${limit}&page=${page}`;
    const arr = await get(path);
    if (!Array.isArray(arr) || arr.length === 0) break;
    total += arr.length;
    if (arr.length < limit) break;
    page += 1;
  }
  return total;
}

(async () => {
  const [people, contracts] = await Promise.all([
    countResource('people'),
    countResource('contracts')
  ]);
  console.log(JSON.stringify({ people, contracts }));
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
