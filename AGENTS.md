# doc-management-backend

## 快速开始

```bash
pnpm install
pnpm run prisma:generate    # 生成 Prisma 客户端
pnpm run dev                # tsx src/server.ts
pnpm run dev:watch          # nodemon --exec tsx src/server.ts
```

## 架构

| 层 | 目录 | 职责 |
|-------|------|------|
| 入口 | `src/server.ts` → `src/app.ts` | 初始化数据库，启动 Express |
| 路由 | `src/routes/index.ts` | 挂载所有 `/api/*` 路由 |
| 控制器 | `src/controllers/` | 请求/响应处理 |
| 服务层 | `src/services/` | 业务逻辑 |
| 中间件 | `src/middlewares/` | 认证、权限、限流、审计 |
| 配置 | `src/config/index.ts` | 读取 `.env`，导出类型化配置 |
| 模型 | `src/models/` | TypeScript 接口定义（非 Prisma） |
| 工具 | `src/utils/` | JWT、加密、文件操作、日志、MeiliSearch |

**路由路径：**
- `/api/auth` – 用户路由
- `/api/oauth` – GitLab/钉钉/微信 OAuth
- `/api/documents` – 文档 CRUD
- `/api/folders` – 文件夹 CRUD
- `/api/groups` – 组管理
- `/api/permissions` – 权限 CRUD
- `/api/onlyoffice` – OnlyOffice 编辑器配置 + 回调
- `/api/search` – MeiliSearch
- `/api/audit` – 审计日志

## 关键事实

- **ESM**（`"type": "module"`）。所有导入必须包含 `.js` 扩展名（如 `from './db.js'`）。
- **包管理**：pnpm（`pnpm-lock.yaml`）
- **数据库**：SQLite 通过 Prisma + `@prisma/adapter-libsql`。Schema 位于 `prisma/schema.prisma`。使用 `pnpm run prisma:migrate` 或 `prisma:push` 更改 schema。
- **认证**：JWT 在 `Authorization` 请求头中（无 Bearer 前缀）。参见 `src/utils/jwt.ts` 和 `src/middlewares/auth.middleware.ts`。
- **管理员用户**硬编码在 `src/app.ts:makSureAdminUserExist`，邮箱为 `15294745236@163.com`。
- **两个 JWT 密钥**：一个用于应用认证（`JWT_SECRET`），一个用于 OnlyOffice token（`ONLYOFFICE_JWT_SECRET`）。
- **上传流程**：分片上传通过 `UploadSession` 模型 → `upload.service.ts` → 合并 → `createDocument` + `createDocumentVersion` + `DocumentRelateDV`。
- **文件存储**：`uploads/{temp,documents,versions,previews}`，在 `.env` 中配置。
- **自定义 AES-256-GCM** 加密在 `src/utils/crypto.ts`（与密码的 bcrypt 分开）。
- **没有定义 lint、test 或 typecheck 脚本**。只有 `tsc` 构建。
- **外部服务**：OnlyOffice Document Server、Redis、MeiliSearch、SMTP 邮件。

## 权限模型（设计中，待实现）

**Permission 表**（`permissions`）：
- `operatorId` — 赋权人（用户A）
- `toId` — 被授权人（用户B）
- `targetId` — 文档ID（固定为文档）
- `permission` — 位掩码字符串，如 `"0x000001"`，用与或非判断
- `startTime` / `endTime` — 时间窗口，不在窗口内拒绝
- `password` — 密码校验
- `count` — 访问次数，每次请求自减，到 0 删除

**config 接口校验流程**（`GET /api/onlyoffice/:documentId/config`）：

```
1. ownerType === 'public' → 放行
2. user.role === 'admin' → 放行
3. 内用户：
   a. ownerType === 'user' && ownerId === userId → 放行
   b. ownerType === 'group' → 查 GroupMember → 在组内则放行
   c. ownerType === 'folder' → 上溯 Folder 至多 2 层找 group → 查 GroupMember → 放行
   d. 查 Permission 表 (toId=userId, targetId=documentId)：
      - 不在时间窗口 → 拒绝
      - password 不匹配 → 拒绝
      - count 自减，为 0 删记录
      - 解析 permission 位掩码 → 有查看权限 → 放行
   e. 查 Document.permission 字段（fallback）→ 解析 → 有权限放行
   f. 以上都不满足 → 拒绝
```

外共享用户（无系统账号）另走一条不含 `authenticate` 中间件的路由，通过 ShareLink.token 鉴权。

## 古怪处与注意事项

- `permission.middleware.ts:checkDocumentPermission` 引用了未声明的 `document` 变量（第 26-28 行的死代码）。
- 同一文件中的 `checkOwnership` 是空操作（从不检查所有权）。
- `.env` 文件**没有被 gitignore**（`.gitignore` 中有 `.env`，但文件已提交到仓库——可能是误提交）。
- OnlyOffice 回调键格式：`${documentId}_${version}`（在 `onlyoffice.service.ts:168-169` 中解析）。
- 服务器在配置中默认端口为 5000，但 `.env` 设置为 `3001`。
