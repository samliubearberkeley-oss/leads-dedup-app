# Leads 去重系统

一个智能的leads去重管理系统，自动过滤已发送过邮件的联系人。

## 功能特点

✅ **自动去重** - 上传CSV文件后自动识别已发送的leads  
✅ **重点显示** - 突出显示名字、邮箱和YouTube Channel三个关键信息  
✅ **批量操作** - 支持复制全部邮箱、导出CSV等批量操作  
✅ **数据持久化** - 所有数据存储在InsForge数据库中，永不丢失  
✅ **递归去重** - 每次上传都会自动过滤已存在的记录  

## 使用方法

### 1. 启动应用

```bash
cd leads-dedup-app
npm install
npm run dev
```

应用会在 `http://localhost:5173/` 启动

### 2. 上传CSV文件

- 点击"上传/粘贴"标签
- 拖拽CSV文件到上传区域，或点击选择文件
- 支持多文件同时上传
- 也可以直接粘贴CSV数据

### 3. 查看新Leads

- 上传后自动处理，显示新leads和重复leads数量
- 点击"新Leads"标签查看未发送的联系人
- 表格显示：YouTube Channel、名字/用户名、邮箱

### 4. 保存到数据库

- 确认新leads无误后，点击"保存到数据库"按钮
- 保存后的leads会自动出现在"已发送"列表中
- 下次上传相同数据时会被自动过滤

### 5. 管理已发送Leads

- 点击"已发送"标签查看所有已保存的leads
- 可以删除不需要的记录
- 支持复制单个或全部邮箱

## 数据字段

表格重点显示三个字段：

1. **📺 YouTube Channel** - 频道名称（可点击跳转）
2. **👤 名字/用户名** - 显示用户名或频道名
3. **📧 邮箱** - 邮箱地址（可一键复制）

## CSV格式要求

CSV文件应包含以下列（不区分大小写）：

- `URL` - YouTube频道URL（必需）
- `CHANNEL` - 频道名称
- `USERNAME` - 用户名
- `EMAIL` - 邮箱地址
- `VALID EMAIL` - 验证过的邮箱
- 其他字段（可选）：POST PER MONTH, SIMILARITY, COUNTRY, SUBSCRIBERS, TOPICS, AUDIENCES等

## 技术栈

- **前端**: React + TypeScript + Vite
- **UI**: Tailwind CSS
- **后端**: InsForge (PostgreSQL + PostgREST)
- **CSV解析**: PapaParse

## 数据库结构

所有数据存储在 `sent_leads` 表中，以 `url` 作为唯一标识进行去重。

## 注意事项

- 确保CSV文件包含有效的URL列
- 邮箱字段为空时显示"无邮箱"
- 已保存的数据会永久存储，请谨慎删除
- 建议定期备份数据库
