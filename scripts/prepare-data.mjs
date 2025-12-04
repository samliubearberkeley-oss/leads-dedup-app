import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      channel: row.channel?.trim() || '',
      username: row.username?.trim() || '',
      email: row.email?.trim() || '',
      valid_email: row.valid_email?.trim() || '',
      post_per_month: row.post_per_month?.trim() || '',
      similarity: row.similarity?.trim() || '',
      last_updated: row.last_updated?.trim() || '',
      country: row.country?.trim() || '',
      subscribers: row.subscribers?.trim() || '',
      posts: row.posts?.trim() || '',
      views: row.views?.trim() || '',
      er: row.er?.trim() || '',
      vr: row.vr?.trim() || '',
      links: row.links?.trim() || '',
      topics: row.topics?.trim() || '',
      audiences: row.audiences?.trim() || '',
    }));
}

async function main() {
  console.log('准备数据...\n');

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

  // 保存为JSON文件
  const outputPath = path.join(__dirname, 'leads-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(allLeads, null, 2));
  console.log(`\n数据已保存到: ${outputPath}`);
}

main().catch(console.error);

