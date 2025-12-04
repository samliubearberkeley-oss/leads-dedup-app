import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { 
  Upload, 
  Database, 
  CheckCircle, 
  XCircle, 
  Download, 
  Trash2, 
  RefreshCw,
  Mail,
  Users,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Search,
  X
} from 'lucide-react';
import type { Lead, ProcessResult, Stats } from './types';
import { 
  getSentLeads, 
  checkExistingUrls, 
  saveNewLeads, 
  deleteLead,
  getStats 
} from './lib/insforge';

function App() {
  const [sentLeads, setSentLeads] = useState<Lead[]>([]);
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [duplicates, setDuplicates] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<Stats>({ total: 0, uniqueEmails: 0 });
  const [activeTab, setActiveTab] = useState<'upload' | 'new' | 'sent'>('upload');
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 加载已发送的leads
  const loadSentLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const leads = await getSentLeads();
      setSentLeads(leads);
      const statsData = await getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load sent leads:', error);
      setMessage({ type: 'error', text: '加载数据失败，请重试' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSentLeads();
  }, [loadSentLeads]);

  // 解析CSV数据
  const parseCSVData = (csvText: string): Lead[] => {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const headerMap: Record<string, string> = {
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
      .filter((row: any) => row.url && row.url.trim())
      .map((row: any) => ({
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
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setMessage({ type: 'info', text: '正在处理文件...' });

    try {
      let allLeads: Lead[] = [];

      for (const file of Array.from(files)) {
        const text = await file.text();
        const leads = parseCSVData(text);
        allLeads = [...allLeads, ...leads];
      }

      await processLeads(allLeads);
    } catch (error) {
      console.error('Error processing files:', error);
      setMessage({ type: 'error', text: '处理文件失败' });
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  // 处理粘贴的数据
  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) {
      setMessage({ type: 'error', text: '请粘贴数据' });
      return;
    }

    setIsProcessing(true);
    setMessage({ type: 'info', text: '正在处理数据...' });

    try {
      const leads = parseCSVData(pasteText);
      await processLeads(leads);
      setPasteText('');
      setPasteMode(false);
    } catch (error) {
      console.error('Error processing pasted data:', error);
      setMessage({ type: 'error', text: '处理数据失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理leads并去重，仅展示结果，不自动保存
  const processLeads = async (leads: Lead[]): Promise<ProcessResult> => {
    const urls = leads.map(l => l.url).filter(Boolean);
    const existingUrls = await checkExistingUrls(urls);

    const newLeadsList: Lead[] = [];
    const duplicatesList: Lead[] = [];

    leads.forEach(lead => {
      if (lead.url && existingUrls.has(lead.url)) {
        duplicatesList.push(lead);
      } else if (lead.url) {
        newLeadsList.push(lead);
      }
    });

    setDuplicates(duplicatesList);
    setNewLeads(newLeadsList);

    // 显示去重结果，不自动保存
    if (newLeadsList.length > 0) {
      setMessage({
        type: 'success',
        text: `✅ 去重完成！发现 ${newLeadsList.length} 个新leads，${duplicatesList.length} 个重复。请查看"新Leads"标签页确认后保存。`
      });
      setActiveTab('new'); // 自动切换到新leads标签页
    } else {
      setMessage({
        type: 'warning',
        text: `⚠️ 没有新leads，全部 ${duplicatesList.length} 条记录已存在数据库中`
      });
    }

    return {
      newLeads: newLeadsList,
      duplicates: duplicatesList,
      totalProcessed: leads.length
    };
  };

  // 保存新leads到数据库
  const handleSaveNewLeads = async () => {
    if (newLeads.length === 0) {
      setMessage({ type: 'error', text: '没有新的leads需要保存' });
      return;
    }

    setIsProcessing(true);
    setMessage({ type: 'info', text: '正在保存到数据库...' });

    try {
      const result = await saveNewLeads(newLeads);
      setMessage({
        type: result.failed === 0 ? 'success' : 'warning',
        text: `保存完成！成功: ${result.success}，失败: ${result.failed}`
      });
      
      await loadSentLeads();
      setNewLeads([]);
      setDuplicates([]);
      setActiveTab('sent');
    } catch (error) {
      console.error('Error saving leads:', error);
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 删除单个lead
  const handleDeleteLead = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;

    try {
      const success = await deleteLead(id);
      if (success) {
        setSentLeads(prev => prev.filter(l => l.id !== id));
        setStats(prev => ({ ...prev, total: prev.total - 1 }));
        setMessage({ type: 'success', text: '删除成功' });
      } else {
        setMessage({ type: 'error', text: '删除失败' });
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      setMessage({ type: 'error', text: '删除失败' });
    }
  };

  // 导出新leads为CSV
  const handleExportNewLeads = () => {
    if (newLeads.length === 0) {
      setMessage({ type: 'error', text: '没有数据可导出' });
      return;
    }

    const csv = Papa.unparse(newLeads.map(lead => ({
      URL: lead.url,
      CHANNEL: lead.channel,
      USERNAME: lead.username,
      EMAIL: lead.email,
      'VALID EMAIL': lead.valid_email,
      'POST PER MONTH': lead.post_per_month,
      SIMILARITY: lead.similarity,
      COUNTRY: lead.country,
      SUBSCRIBERS: lead.subscribers,
      TOPICS: lead.topics,
      AUDIENCES: lead.audiences,
    })));

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `new_leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // 复制邮箱
  const handleCopyEmail = async (email: string, id: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // 复制所有邮箱
  const handleCopyAllEmails = async (leads: Lead[]) => {
    const emails = leads
      .map(l => l.email || l.valid_email)
      .filter(Boolean)
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(emails);
      setMessage({ type: 'success', text: `已复制 ${emails.split('\n').length} 个邮箱到剪贴板` });
    } catch (error) {
      console.error('Failed to copy:', error);
      setMessage({ type: 'error', text: '复制失败' });
    }
  };

  // 提取YouTube channel名称
  const getChannelName = (lead: Lead): string => {
    if (lead.channel) return lead.channel;
    if (lead.username) return lead.username;
    // 从URL提取channel名称
    const match = lead.url?.match(/@([^/]+)/);
    return match ? match[1] : 'N/A';
  };

  // 过滤leads
  const filterLeads = (leads: Lead[], query: string): Lead[] => {
    if (!query.trim()) return leads;
    const lowerQuery = query.toLowerCase();
    return leads.filter(lead => 
      (lead.channel?.toLowerCase().includes(lowerQuery)) ||
      (lead.username?.toLowerCase().includes(lowerQuery)) ||
      (lead.email?.toLowerCase().includes(lowerQuery)) ||
      (lead.valid_email?.toLowerCase().includes(lowerQuery)) ||
      (lead.url?.toLowerCase().includes(lowerQuery))
    );
  };

  // 渲染leads表格
  const renderLeadsTable = (leads: Lead[], showDelete = false, showCopyAll = false) => {
    const filteredLeads = filterLeads(leads, searchQuery);
    
    return (
    <div className="overflow-x-auto">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between gap-3 flex-wrap">
        {showCopyAll && filteredLeads.length > 0 && (
          <button
            onClick={() => handleCopyAllEmails(filteredLeads)}
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-lg cursor-pointer"
          >
            <Copy size={14} />
            复制全部邮箱 ({filteredLeads.length})
          </button>
        )}
        <div className={`flex-1 max-w-md ${showCopyAll && filteredLeads.length > 0 ? '' : 'ml-auto'}`}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="搜索频道、用户名或邮箱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 input-field text-sm"
            />
            {searchQuery && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-900/50">
            <th className="text-left py-3 px-4 text-gray-400 font-medium w-12">#</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">📺 YouTube Channel</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">👤 名字/用户名</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">📧 邮箱</th>
            {showDelete && <th className="text-left py-3 px-4 text-gray-400 font-medium w-20">操作</th>}
          </tr>
        </thead>
        <tbody>
          {filteredLeads.length === 0 ? (
            <tr>
              <td colSpan={showDelete ? 5 : 4} className="py-12 text-center text-gray-500">
                {searchQuery ? '没有找到匹配的结果' : '没有数据'}
              </td>
            </tr>
          ) : (
            filteredLeads.map((lead, index) => (
            <tr key={lead.id || index} className="table-row border-b border-gray-800 hover:bg-gray-800/50">
              <td className="py-3 px-4 text-gray-500 text-xs">{index + 1}</td>
              <td className="py-3 px-4">
                <a 
                  href={lead.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center gap-1.5"
                >
                  <span>{getChannelName(lead)}</span>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path>
                  </svg>
                </a>
              </td>
              <td className="py-3 px-4">
                <span className="text-gray-300 font-medium">
                  {lead.username ? `@${lead.username}` : (lead.channel || 'N/A')}
                </span>
              </td>
              <td className="py-3 px-4">
                {(lead.email || lead.valid_email) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-mono text-sm">{lead.email || lead.valid_email}</span>
                    <button
                      onClick={() => handleCopyEmail((lead.email || lead.valid_email)!, lead.id || String(index))}
                      className="text-gray-500 hover:text-blue-400 transition-colors p-1 rounded hover:bg-gray-700 cursor-pointer"
                      title="复制邮箱"
                    >
                      {copiedId === (lead.id || String(index)) ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-600 text-xs">无邮箱</span>
                )}
              </td>
              {showDelete && (
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleDeleteLead(lead.id!)}
                    className="text-red-400 hover:text-red-300 transition-colors p-1.5 rounded hover:bg-red-500/10 cursor-pointer"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              )}
            </tr>
            ))
          )}
        </tbody>
      </table>
      {searchQuery && filteredLeads.length > 0 && (
        <div className="p-3 border-t border-gray-800 text-sm text-gray-500 text-center">
          显示 {filteredLeads.length} / {leads.length} 条结果
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Leads 去重系统</h1>
                <p className="text-xs text-gray-500">自动过滤已发送的邮件联系人</p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-gray-400">
                <Database size={18} />
                <span className="text-sm">{stats.total} 已发送</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Mail size={18} />
                <span className="text-sm">{stats.uniqueEmails} 邮箱</span>
              </div>
              <button
                onClick={loadSentLeads}
                disabled={isLoading}
                className="text-gray-400 hover:text-white transition-colors p-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div className={`mx-auto max-w-7xl px-6 py-3 fade-in`}>
          <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
            message.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {message.type === 'success' ? <CheckCircle size={18} /> :
             message.type === 'error' ? <XCircle size={18} /> :
             message.type === 'warning' ? <XCircle size={18} /> :
             <RefreshCw size={18} className="animate-spin" />}
            <span className="text-sm">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-gray-500 hover:text-gray-300 cursor-pointer"
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              console.log('Upload tab clicked');
              setActiveTab('upload');
            }}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload size={16} />
              上传/粘贴
            </div>
          </button>
          <button
            onClick={() => {
              console.log('New leads tab clicked');
              setActiveTab('new');
            }}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              新Leads
              {newLeads.length > 0 && (
                <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {newLeads.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => {
              console.log('Sent tab clicked');
              setActiveTab('sent');
            }}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database size={16} />
              已发送
              <span className="text-xs opacity-60">({stats.total})</span>
            </div>
          </button>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="slide-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Upload */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 card-hover">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <FileSpreadsheet size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">上传CSV文件</h2>
                    <p className="text-xs text-gray-500">支持多文件同时上传</p>
                  </div>
                </div>
                
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors pointer-events-none">
                    <Upload size={32} className="mx-auto text-gray-500 mb-3" />
                    <p className="text-gray-400 mb-1">点击或拖拽文件到此处</p>
                    <p className="text-xs text-gray-600">支持 .csv 格式</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              </div>

              {/* Paste Mode */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 card-hover">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Copy size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">粘贴数据</h2>
                    <p className="text-xs text-gray-500">直接粘贴CSV格式数据</p>
                  </div>
                </div>

                {!pasteMode ? (
                  <button
                    onClick={() => {
                      console.log('Paste mode button clicked');
                      setPasteMode(true);
                    }}
                    className="w-full border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer"
                  >
                    <Copy size={32} className="mx-auto text-gray-500 mb-3" />
                    <p className="text-gray-400 mb-1">点击开始粘贴</p>
                    <p className="text-xs text-gray-600">支持从Excel复制的数据</p>
                  </button>
                ) : (
                  <div>
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="粘贴CSV数据（包含表头）..."
                      className="w-full h-40 input-field resize-none text-sm font-mono"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handlePasteSubmit}
                        disabled={isProcessing}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowRight size={16} />
                        处理数据
                      </button>
                      <button
                        onClick={() => { setPasteMode(false); setPasteText(''); }}
                        className="btn-secondary cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results Summary */}
            {(newLeads.length > 0 || duplicates.length > 0) && (
              <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">处理结果</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle size={24} className="text-emerald-400" />
                      <div>
                        <p className="text-2xl font-bold text-emerald-400">{newLeads.length}</p>
                        <p className="text-sm text-gray-400">新Leads（未发送）</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <XCircle size={24} className="text-amber-400" />
                      <div>
                        <p className="text-2xl font-bold text-amber-400">{duplicates.length}</p>
                        <p className="text-sm text-gray-400">重复（已发送）</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* New Leads Tab */}
        {activeTab === 'new' && (
          <div className="slide-up">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  新Leads（{newLeads.length}）
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportNewLeads}
                    disabled={newLeads.length === 0}
                    className="btn-secondary flex items-center gap-2 text-sm !py-2 !px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={16} />
                    导出CSV
                  </button>
                  <button
                    onClick={handleSaveNewLeads}
                    disabled={newLeads.length === 0 || isProcessing}
                    className="btn-primary flex items-center gap-2 text-sm !py-2 !px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Database size={16} />
                    保存到数据库
                  </button>
                </div>
              </div>
              
              {newLeads.length > 0 ? (
                renderLeadsTable(newLeads, false, true)
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>还没有新的leads</p>
                  <p className="text-sm mt-1">上传CSV文件或粘贴数据开始处理</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sent Leads Tab */}
        {activeTab === 'sent' && (
          <div className="slide-up">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">
                  已发送的Leads（{sentLeads.length}）
                </h2>
              </div>
              
              {isLoading ? (
                <div className="p-12 text-center">
                  <RefreshCw size={32} className="mx-auto mb-4 text-blue-400 animate-spin" />
                  <p className="text-gray-400">加载中...</p>
                </div>
              ) : sentLeads.length > 0 ? (
                renderLeadsTable(sentLeads, true, true)
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <Database size={48} className="mx-auto mb-4 opacity-50" />
                  <p>数据库中还没有记录</p>
                  <p className="text-sm mt-1">保存新leads后会显示在这里</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
