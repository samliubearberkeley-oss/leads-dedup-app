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
  
  // 如果精确匹配找到了一些，直接返回
  if (foundExactMatches.size > 0) {
    return foundExactMatches;
  }
  
  // 如果精确匹配没找到任何结果，可能是URL格式不一致
  // 获取所有数据库URL进行规范化比较（仅当精确匹配失败时）
  console.log('精确匹配未找到，进行规范化比较（可能URL格式不一致）...');
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
  
  // 分批插入，每批50个
  const batchSize = 50;
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    const { error } = await insforge.database
      .from('sent_leads')
      .insert(batch)
      .select();
    
    if (error) {
      console.error('Error inserting leads:', error);
      failed += batch.length;
    } else {
      success += batch.length;
    }
  }
  
  return { success, failed };
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

