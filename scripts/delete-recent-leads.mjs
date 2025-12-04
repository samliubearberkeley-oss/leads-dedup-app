import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://g7str5qu.us-east.insforge.app',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzI2NDR9.27eHRO6MngQMMu09XUltA7ACcz2r4WI_ARmq-Qwan2E'
});

async function deleteRecentLeads() {
  console.log('正在查询数据库中的记录...\n');

  // 先查询所有记录，按创建时间降序排列
  const { data: allLeads, error: fetchError } = await insforge.database
    .from('sent_leads')
    .select('id, url, channel, created_at')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('查询失败:', fetchError);
    return;
  }

  console.log(`数据库中共有 ${allLeads.length} 条记录\n`);

  if (allLeads.length === 0) {
    console.log('数据库为空，无需删除');
    return;
  }

  // 显示最近10条记录的信息
  console.log('最近10条记录：');
  allLeads.slice(0, 10).forEach((lead, index) => {
    const date = lead.created_at ? new Date(lead.created_at).toLocaleString('zh-CN') : 'N/A';
    console.log(`${index + 1}. [${date}] ${lead.channel || lead.url || 'N/A'}`);
  });

  // 询问是否删除最近的记录
  const recentCount = Math.min(350, allLeads.length); // 删除最多350条（包含300多条的缓冲）
  console.log(`\n准备删除最近的 ${recentCount} 条记录...`);

  // 获取要删除的ID列表
  const idsToDelete = allLeads.slice(0, recentCount).map(lead => lead.id).filter(Boolean);

  if (idsToDelete.length === 0) {
    console.log('没有找到可删除的记录');
    return;
  }

  console.log(`\n开始删除 ${idsToDelete.length} 条记录...`);

  // 分批删除，每批50个
  const batchSize = 50;
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    
    const { error: deleteError } = await insforge.database
      .from('sent_leads')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`删除批次 ${Math.floor(i / batchSize) + 1} 失败:`, deleteError);
      failed += batch.length;
    } else {
      deleted += batch.length;
      process.stdout.write(`\r已删除: ${deleted}/${idsToDelete.length}`);
    }
  }

  console.log(`\n\n删除完成！`);
  console.log(`成功删除: ${deleted} 条`);
  if (failed > 0) {
    console.log(`失败: ${failed} 条`);
  }

  // 查询剩余记录数
  const { count } = await insforge.database
    .from('sent_leads')
    .select('*', { count: 'exact', head: true });

  console.log(`\n数据库中剩余记录数: ${count || 0}`);
}

deleteRecentLeads().catch(console.error);

