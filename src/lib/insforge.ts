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

// 检查URL是否已存在
export async function checkExistingUrls(urls: string[]): Promise<Set<string>> {
  const existingUrls = new Set<string>();
  
  // 分批查询，每批100个
  const batchSize = 100;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const { data, error } = await insforge.database
      .from('sent_leads')
      .select('url')
      .in('url', batch);
    
    if (error) {
      console.error('Error checking URLs:', error);
      continue;
    }
    
    data?.forEach(item => existingUrls.add(item.url));
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

