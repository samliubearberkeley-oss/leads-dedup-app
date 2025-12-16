import { createClient } from '@insforge/sdk';
import type { Lead } from '../types';

export const insforge = createClient({
  baseUrl: 'https://g7str5qu.us-east.insforge.app',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzI2NDR9.27eHRO6MngQMMu09XUltA7ACcz2r4WI_ARmq-Qwan2E'
});

export type { Lead };

// 获取所有已发送的leads
export async function getSentLeads(): Promise<Lead[]> {
  const { data, error } = await insforge.database
    .from('sent_leads')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching sent leads:', error);
    throw error;
  }
  
  return data || [];
}

// 规范化URL（用于去重比较）
function normalizeUrl(url: string): string {
  if (!url) return '';
  // 移除首尾空格，转为小写，移除尾随斜杠
  return url.trim().toLowerCase().replace(/\/+$/, '');
}

// 检查URL是否已存在
export async function checkExistingUrls(urls: string[]): Promise<Set<string>> {
  const existingUrls = new Set<string>();
  
  if (urls.length === 0) {
    return existingUrls;
  }
  
  // 过滤有效URLs
  const validUrls = urls.filter(url => url && url.trim());
  if (validUrls.length === 0) {
    return existingUrls;
  }
  
  // 先尝试精确匹配（效率高）
  const batchSize = 100;
  const foundExactMatches = new Set<string>();
  
  for (let i = 0; i < validUrls.length; i += batchSize) {
    const batch = validUrls.slice(i, i + batchSize);
    
    const { data, error } = await insforge.database
      .from('sent_leads')
      .select('url')
      .in('url', batch);
    
    if (error) {
      console.error('Error checking URLs:', error);
      continue;
    }
    
    // 记录精确匹配的URL（规范化后）
    data?.forEach(item => {
      if (item.url) {
        foundExactMatches.add(normalizeUrl(item.url));
      }
    });
  }
  
  // 将精确匹配的结果加入最终结果
  foundExactMatches.forEach(url => existingUrls.add(url));
  
  // 如果精确匹配已经找到了所有URL，可以提前返回
  if (foundExactMatches.size >= validUrls.length) {
    return existingUrls;
  }
  
  // 获取所有数据库URL进行规范化比较（确保不遗漏格式不同的重复项）
  const { data: allDbUrls, error: dbError } = await insforge.database
    .from('sent_leads')
    .select('url');
  
  if (!dbError && allDbUrls) {
    // 创建规范化后的数据库URLs Set
    const dbNormalizedUrls = new Set<string>();
    allDbUrls.forEach(item => {
      if (item.url) {
        dbNormalizedUrls.add(normalizeUrl(item.url));
      }
    });
    
    // 检查输入的URLs（规范化后）是否在数据库中
    validUrls.forEach(inputUrl => {
      const normalized = normalizeUrl(inputUrl);
      if (dbNormalizedUrls.has(normalized)) {
        existingUrls.add(normalized);
      }
    });
  }
  
  return existingUrls;
}

// 保存新的leads到数据库
export async function saveNewLeads(leads: Lead[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  // 先再次检查URL，确保没有重复
  const urlsToInsert = leads.map(l => normalizeUrl(l.url)).filter(Boolean);
  const existingUrls = await checkExistingUrls(urlsToInsert);
  
  // 过滤掉已存在的leads
  const leadsToInsert = leads.filter(lead => {
    if (!lead.url || !lead.url.trim()) {
      return false; // 跳过没有URL的记录
    }
    const normalizedUrl = normalizeUrl(lead.url);
    return !existingUrls.has(normalizedUrl);
  });
  
  console.log(`准备插入 ${leadsToInsert.length} 条记录（已过滤 ${leads.length - leadsToInsert.length} 条重复）`);
  
  if (leadsToInsert.length === 0) {
    return { success: 0, failed: leads.length };
  }
  
  // 分批插入，每批50个
  const batchSize = 50;
  for (let i = 0; i < leadsToInsert.length; i += batchSize) {
    const batch = leadsToInsert.slice(i, i + batchSize);
    
    try {
      const { error } = await insforge.database
        .from('sent_leads')
        .insert(batch)
        .select();
      
      if (error) {
        console.error('批量插入错误:', error);
        console.error('错误详情:', JSON.stringify(error, null, 2));
        
        // 如果批量插入失败，尝试逐个插入以找出问题记录
        console.log(`批量插入失败，尝试逐个插入 ${batch.length} 条记录...`);
        for (const lead of batch) {
          try {
            const { error: singleError } = await insforge.database
              .from('sent_leads')
              .insert(lead)
              .select();
            
            if (singleError) {
              console.error(`单条插入失败 (URL: ${lead.url}):`, singleError);
              failed++;
            } else {
              success++;
            }
          } catch (err) {
            console.error(`单条插入异常 (URL: ${lead.url}):`, err);
            failed++;
          }
        }
      } else {
        success += batch.length;
        console.log(`成功插入批次 ${Math.floor(i / batchSize) + 1}，${batch.length} 条记录`);
      }
    } catch (err) {
      console.error('插入异常:', err);
      failed += batch.length;
    }
  }
  
  // 计算被过滤掉的重复记录
  const filteredDuplicates = leads.length - leadsToInsert.length;
  if (filteredDuplicates > 0) {
    console.log(`过滤掉 ${filteredDuplicates} 条重复记录`);
  }
  
  return { success, failed: failed + filteredDuplicates };
}

// 删除lead
export async function deleteLead(id: string): Promise<boolean> {
  const { error } = await insforge.database
    .from('sent_leads')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting lead:', error);
    return false;
  }
  
  return true;
}

// 获取统计信息
export async function getStats(): Promise<{ total: number; uniqueEmails: number }> {
  const { data, error, count } = await insforge.database
    .from('sent_leads')
    .select('email, valid_email', { count: 'exact' });
  
  if (error) {
    console.error('Error getting stats:', error);
    return { total: 0, uniqueEmails: 0 };
  }
  
  const allEmails = data?.flatMap(d => [d.email, d.valid_email]).filter(Boolean) || [];
  const uniqueEmails = new Set(allEmails).size;
  
  return { total: count || 0, uniqueEmails };
}

// 使用AI判断AUDIENCES是否包含technical/coding/developer相关
export async function checkAudienceWithAI(audiences: string): Promise<boolean> {
  if (!audiences || !audiences.trim()) {
    return false;
  }

  try {
    const prompt = `请判断以下AUDIENCES内容是否与technical、coding、developer相关。

AUDIENCES: "${audiences}"

请只回答 "YES" 或 "NO"，不要添加任何其他文字。

判断标准：
- 如果包含以下关键词或相关概念，回答 YES：technical, coding, developer, programmer, software engineer, tech professional, IT professional, computer science, software development, web development, programming, coder, software developer, tech enthusiast, developer community
- 如果完全不相关（比如只是general audience, students without tech focus, general public等），回答 NO
- 如果部分相关或模糊，倾向于回答 YES（只要有任何技术相关的内容）`;

    const completion = await insforge.ai.chat.completions.create({
      model: 'openai/gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that analyzes audience descriptions. Only respond with "YES" or "NO".'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // 低温度确保一致性
      maxTokens: 10
    });

    const response = completion.choices[0]?.message?.content?.trim().toUpperCase() || '';
    return response === 'YES';
  } catch (error) {
    console.error('AI判断失败:', error);
    // 如果AI调用失败，使用简单的关键词匹配作为后备
    const lowerAudiences = audiences.toLowerCase();
    const keywords = ['technical', 'coding', 'developer', 'programmer', 'software engineer', 'tech', 'programming', 'coder', 'software developer', 'it professional', 'computer science', 'web development'];
    return keywords.some(keyword => lowerAudiences.includes(keyword));
  }
}

// 批量使用AI清洗leads（检查AUDIENCES列）
export async function cleanLeadsWithAI(leads: Lead[]): Promise<{ kept: Lead[]; removed: Lead[] }> {
  const kept: Lead[] = [];
  const removed: Lead[] = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const audiences = lead.audiences || '';
    
    try {
      const isRelevant = await checkAudienceWithAI(audiences);
      if (isRelevant) {
        kept.push(lead);
      } else {
        removed.push(lead);
      }
      
      // 每处理10个显示一次进度
      if ((i + 1) % 10 === 0) {
        console.log(`AI清洗进度: ${i + 1}/${leads.length}`);
      }
    } catch (error) {
      console.error(`处理lead ${i + 1} 时出错:`, error);
      // 出错时默认保留（保守策略）
      kept.push(lead);
    }
  }

  return { kept, removed };
}

