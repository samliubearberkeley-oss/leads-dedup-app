import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'https://g7str5qu.us-east.insforge.app';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzI2NDR9.27eHRO6MngQMMu09XUltA7ACcz2r4WI_ARmq-Qwan2E';

// CSV文件路径
const CSV_FILES = [
  path.join(__dirname, '../../Influencer - coding2.csv'),
  path.join(__dirname, '../../Influencer - coding 3.csv'),
  path.join(__dirname, '../../Influencer - coding 4.csv'),
];

// 解析CSV数据
function parseCSVFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      const headerMap = {
        'URL': 'url',
        'CHANNEL': 'channel',
        'POST PER MONTH': 'post_per_month',
        'SIMILARITY': 'similarity',
        'LAST UPDATED': 'last_updated',
        'COUNTRY': 'country',
        'SUBSCRIBERS': 'subscribers',
        'POSTS': 'posts',
        'VIEWS': 'views',
        'ER': 'er',
        'VR': 'vr',
        'EMAIL': 'email',
        'VALID EMAIL': 'valid_email',
        'LINKS': 'links',
        'TOPICS': 'topics',
        'AUDIENCES': 'audiences',
        'USERNAME': 'username',
      };
      return headerMap[header.trim()] || header.toLowerCase().replace(/\s+/g, '_');
    }
  });

  return result.data
    .filter((row) => row.url && row.url.trim() && row.url.startsWith('http'))
    .map((row) => ({
      url: row.url?.trim() || '',
      channel: row.channel?.trim() || null,
      username: row.username?.trim() || null,
      email: row.email?.trim() || null,
      valid_email: row.valid_email?.trim() || null,
      post_per_month: row.post_per_month?.trim() || null,
      similarity: row.similarity?.trim() || null,
      last_updated: row.last_updated?.trim() || null,
      country: row.country?.trim() || null,
      subscribers: row.subscribers?.trim() || null,
      posts: row.posts?.trim() || null,
      views: row.views?.trim() || null,
      er: row.er?.trim() || null,
      vr: row.vr?.trim() || null,
      links: row.links?.trim() || null,
      topics: row.topics?.trim() || null,
      audiences: row.audiences?.trim() || null,
    }));
}

// 批量插入数据
async function insertBatch(leads) {
  const response = await fetch(`${BASE_URL}/rest/v1/sent_leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
      'Prefer': 'return=minimal,resolution=ignore-duplicates'
    },
    body: JSON.stringify(leads)
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Error inserting batch: ${response.status}`, text);
    return false;
  }

  return true;
}

async function main() {
  console.log('开始导入初始数据...\n');

  let allLeads = [];
  const urlSet = new Set();

  // 读取所有CSV文件
  for (const filePath of CSV_FILES) {
    const fileName = path.basename(filePath);
    console.log(`读取文件: ${fileName}`);
    
    try {
      const leads = parseCSVFile(filePath);
      console.log(`  - 找到 ${leads.length} 条有效记录`);
      
      // 去重
      for (const lead of leads) {
        if (!urlSet.has(lead.url)) {
          urlSet.add(lead.url);
          allLeads.push(lead);
        }
      }
    } catch (error) {
      console.error(`  - 读取失败: ${error.message}`);
    }
  }

  console.log(`\n总计: ${allLeads.length} 条不重复记录`);

  // 分批插入
  const BATCH_SIZE = 50;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < allLeads.length; i += BATCH_SIZE) {
    const batch = allLeads.slice(i, i + BATCH_SIZE);
    const ok = await insertBatch(batch);
    
    if (ok) {
      success += batch.length;
    } else {
      failed += batch.length;
    }

    process.stdout.write(`\r进度: ${Math.min(i + BATCH_SIZE, allLeads.length)}/${allLeads.length}`);
  }

  console.log(`\n\n导入完成！`);
  console.log(`成功: ${success}`);
  console.log(`失败: ${failed}`);
}

main().catch(console.error);




