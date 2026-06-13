# TokenMP Contracts

TokenMP Management API 的 OpenAPI 契约与代码生成仓库。

本仓库维护 TokenMP 管理端、用户端、公开端等 `/api/v1/*` Management API 的接口规范，并通过生成流程产出前端 TypeScript 类型、Go 类型和错误码常量。`openapi/` 下的 YAML 文件是 API 契约的单一事实来源。

## 仓库定位

- **API 契约源头**：所有 Management API 的 path、schema、响应结构、错误码、认证要求等都应先在 `openapi/` 中定义。
- **跨仓库类型生成**：基于 `bundled.yaml` 为 `web` 生成 TypeScript 类型，为 `manager` 生成 Go API 类型，并为 `manager` / `executor` 生成错误码常量。
- **实现对齐检查**：通过脚本对比 `manager` 中注册的 `/api/v1/*` 路由与 OpenAPI paths，发现契约缺口。

> 注意：本仓库描述的是 Management API 的原始后端 shape。前端展示层可能会做 normalizer，例如把 `status: string` 转换为 `is_active: boolean`；这类 normalized 类型不属于 contracts 的职责。

## 目录结构

```text
contracts/
  CLAUDE.md                  仓库内开发规范说明
  package.json               pnpm 脚本与依赖
  pnpm-lock.yaml             pnpm lockfile
  bundled.yaml               由 openapi/ 合并生成的完整 OpenAPI 文件
  openapi/
    root.yaml                OpenAPI 3.1 根文件：info、servers、tags、securitySchemes
    headers.yaml             公共响应头定义，例如 Cache-Control: no-store
    paths/                   API path 定义，按角色和领域拆分
    schemas/                 schema 定义，按领域拆分
  scripts/
    bundle.mjs               合并 openapi/ 多文件规范到 bundled.yaml
    check-paths.mjs          检查 manager 注册路由与 bundled.yaml 是否对齐
    gen-error-codes.mjs      从错误码 schema 生成 Go 常量
```

`openapi/paths/` 按角色和领域拆分，例如（非完整列表）：

```text
auth.yaml
public.yaml
public-extra.yaml
user-panel.yaml
user-config.yaml
user-keys-extra.yaml
user-redeem.yaml
admin-user.yaml
admin-users-extra.yaml
admin-provider.yaml
admin-model.yaml
admin-routes.yaml
admin-upstream-key.yaml
admin-plan.yaml
admin-redeem.yaml
admin-ratrule.yaml
admin-config.yaml
admin-requestlog.yaml
admin-usage.yaml
admin-dashboard.yaml
admin-workbench.yaml
```

`openapi/schemas/` 按领域拆分，例如：

```text
common.yaml          公共枚举、错误码、时间戳等
envelope.yaml        响应 envelope、分页结构
user.yaml            用户、认证、API Key、Bot Key
provider.yaml        Provider 与 Provider Endpoint
upstream-key.yaml    Upstream Key
model.yaml           Model、Route Group、Model Route Mapping
plan.yaml            Plan 与用户套餐
redeem.yaml          Redeem Code 与兑换记录
ratrule.yaml         Rate Rule
requestlog.yaml      请求日志与 trace
usage.yaml           配额、用量、ledger
sysconfig.yaml       系统配置、dashboard、用户配置等
```

## 快速开始

```bash
pnpm install
pnpm run validate
```

常用完整检查流程：

```bash
pnpm run validate
pnpm run generate
pnpm run check-paths
```

如果需要生成 `manager` 的 Go API 类型：

```bash
cd ../manager
oapi-codegen --config internal/management/apigen/oapi-codegen.yaml ../contracts/bundled.yaml
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm run bundle` | 执行 `node scripts/bundle.mjs`，把 `openapi/root.yaml`、`openapi/paths/*.yaml`、`openapi/schemas/*.yaml`、`openapi/headers.yaml` 合并为 `bundled.yaml`。 |
| `pnpm run validate` | 先重新生成 `bundled.yaml`，再用 Redocly lint 校验。 |
| `pnpm run check-paths` | 扫描 `../manager/cmd/management/main.go` 中注册的 `/api/v1/*` 路由，检查是否被 `bundled.yaml` 覆盖。 |
| `pnpm run generate:ts` | 根据 `bundled.yaml` 生成前端类型到 `../web/src/types/generated.ts`。 |
| `pnpm run generate:error-codes` | 根据 `bundled.yaml` 中的错误码 schema 生成 Go 错误码常量。 |
| `pnpm run generate` | 执行 `bundle + generate:ts + generate:error-codes`。 |
| `pnpm run generate:go` | 当前只是提示手动运行 `oapi-codegen`，不会实际生成文件。 |

### 命令注意事项

- `generate` **不包含** Redocly lint、`check-paths`，也**不生成** `manager` 的 Go API 类型。
- `generate:ts` 依赖相邻目录存在 `../web`。
- `generate:error-codes` 会写入相邻 `../manager` 和 `../executor`，运行前需确认目录存在。
- `check-paths` 依赖相邻目录存在 `../manager/cmd/management/main.go`。

## 生成文件

不要手动编辑生成文件。修改 API 契约后，应修改 `openapi/` 源文件，再运行对应生成命令。

常见生成产物：

```text
bundled.yaml
../web/src/types/generated.ts
../manager/internal/management/apigen/types.gen.go
../manager/internal/management/apigen/error_codes.gen.go
../executor/internal/errorcodes/error_codes.gen.go
```

## 开发流程

1. **确认契约变更范围**
   - 新增或修改 API：编辑 `openapi/paths/*.yaml`。
   - 新增或修改数据结构：编辑 `openapi/schemas/*.yaml`。
   - 新增公共响应头：编辑 `openapi/headers.yaml`。
   - 修改根信息、server、tag、安全方案：编辑 `openapi/root.yaml`。

2. **遵循现有路由和 schema 规范**
   - 路径使用 `/api/v1/{scope}/{category}/{type}/{action}`。
   - JSON 字段使用 `snake_case`。
   - `/api/v1/*` 统一使用响应 envelope。
   - 列表接口使用分页结构。
   - 管理端写操作使用 `POST`。

3. **重新生成并校验**

   ```bash
   pnpm run validate
   pnpm run generate
   ```

4. **检查 manager 路由覆盖**

   ```bash
   pnpm run check-paths
   ```

5. **必要时生成 Go 类型**

   ```bash
   cd ../manager
   oapi-codegen --config internal/management/apigen/oapi-codegen.yaml ../contracts/bundled.yaml
   ```

6. **提交源文件和生成产物**
   - 应提交 `openapi/**/*.yaml` 的源变更。
   - 应提交由命令生成的 `bundled.yaml` 和跨仓库生成文件。

## OpenAPI 编写规范

### OpenAPI 版本

本仓库使用 OpenAPI 3.1：

```yaml
openapi: 3.1.0
```

### `$ref` 引用

源文件中使用相对路径引用：

```yaml
$ref: ../schemas/envelope.yaml#/ApiResponse
$ref: ../schemas/user.yaml#/UserResponse
$ref: ../headers.yaml#/CacheNoStore
```

`bundle.mjs` 会在生成 `bundled.yaml` 时重写为内部 components 引用：

```yaml
$ref: '#/components/schemas/ApiResponse'
$ref: '#/components/headers/CacheNoStore'
```

### Schema 组织

- 公共结构、枚举、错误码放在 `common.yaml`。
- 响应 envelope 和分页结构放在 `envelope.yaml`。
- 领域对象、创建/更新请求、列表项、详情响应等放在对应领域 schema 文件中。
- 优先复用已有 schema，不要重复定义相同结构。
- 使用 `allOf` 组合 envelope 和具体 `data` 类型。

常见命名：

```text
CreateXRequest
UpdateXRequest
DeleteXRequest
ToggleXRequest
XResponse
XListItem
XWorkbenchData
```

## 路由规范

TokenMP Management API 采用**分类优先、非 RESTful** 的路径风格：

```text
/api/v1/{scope}/{category}/{type}/{action}
```

### Scope

常见 scope：

| Scope | 说明 |
| --- | --- |
| `public` | 公开接口，一般无需认证。 |
| `user` | 用户侧接口，需要用户 JWT。 |
| `admin` | 管理侧接口，需要管理员 JWT / admin 角色。 |

### Category / Type / Action

- `{category}` 表示领域分类，例如 `users`、`models`、`providers`、`routes`、`keys`、`codes`、`rules`、`config`。
- `{type}` 用于可扩展资源类型，例如 `rules/rate`、`codes/redeem`、`keys/upstream`、`keys/api`。
- `{action}` 表示动作，例如 `list`、`detail`、`create`、`update`、`delete`、`toggle`、`refresh`、`reset`、`redeem`。

实际路径可根据资源复杂度省略或增加层级，但应保持分类优先和动作后缀的命名风格。

示例：

```text
GET  /api/v1/public/models/list
GET  /api/v1/user/keys/api/list
POST /api/v1/user/keys/api/create
GET  /api/v1/admin/providers/list
POST /api/v1/admin/providers/create
GET  /api/v1/admin/rules/rate/list
POST /api/v1/admin/codes/redeem/create
```

### 方法约定

- 读操作使用 `GET`。
- 管理端写操作统一使用 `POST`。
- 当前 Management API 契约不使用 `PUT`、`PATCH`、`DELETE` 表达写操作。

### 新增路由前的检查

新增 API route 前，应先对照已有路径族，确认命名和层级一致：

- 同类资源是否已有 `list/detail/create/update/delete/toggle`。
- 是否应放在已有 category 下，而不是新建平行路径。
- 可扩展资源是否应使用 `category/type/action`。
- operationId 是否与同族接口保持一致。

## 响应规范

### Management API Envelope

`/api/v1/*` Management API 统一返回 JSON envelope：

```json
{
  "code": 200,
  "data": {},
  "message": "ok",
  "error_code": ""
}
```

成功响应使用 `ApiResponse`，错误响应使用 `ApiErrorResponse`。

典型成功响应写法：

```yaml
schema:
  allOf:
    - $ref: ../schemas/envelope.yaml#/ApiResponse
    - type: object
      properties:
        data:
          $ref: ../schemas/model.yaml#/ModelResponse
```

### 错误响应

错误也应使用 JSON envelope，不应返回框架默认 HTML 或 `text/plain`：

```json
{
  "code": 404,
  "data": null,
  "message": "not found",
  "error_code": "NOT_FOUND"
}
```

`/v1/*` OpenAI-compatible API 是独立兼容边界，可保持 OpenAI 风格错误格式，不与 `/api/v1/*` envelope 混用。

## 分页规范

列表接口的 `data` 使用分页结构：

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 0
}
```

字段语义：

| 字段 | 说明 |
| --- | --- |
| `items` | 当前页数据。无结果时返回空数组。 |
| `page` | 当前页码，从 1 开始。 |
| `limit` | 每页数量，通常最大 100。 |
| `total` | 应用搜索和筛选条件后的总数。 |
| `has_more` | 可选，是否还有更多数据。 |
| `total_estimated` | 可选，`total` 是否为估算值。 |

## 错误码规范

错误码集中定义在 `openapi/schemas/common.yaml` 的 `ErrorCode`，使用 `UPPERCASE_SNAKE_CASE`。

示例：

```text
INVALID_PARAM
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
QUOTA_EXCEEDED
UPSTREAM_TIMEOUT
UPSTREAM_INTERNAL_ERROR
```

错误码还可维护元数据，用于前端展示、排查、重试策略等：

```yaml
x-enum-descriptions
x-enum-categories
x-enum-actions
```

修改错误码后，应运行：

```bash
pnpm run generate:error-codes
```

## 认证与安全

`openapi/root.yaml` 定义了 JWT Bearer 认证方案：

```yaml
bearerAuth:
  type: http
  scheme: bearer
  bearerFormat: JWT

adminBearerAuth:
  type: http
  scheme: bearer
  bearerFormat: JWT
```

约定：

- public/auth 部分接口可以不要求认证。
- user 接口使用 `bearerAuth`。
- admin 接口使用 `adminBearerAuth`，语义上要求 admin 角色。
- 敏感接口响应应声明 `Cache-Control: no-store`。

公共 header 定义在 `openapi/headers.yaml`，例如：

```yaml
headers:
  Cache-Control:
    $ref: ../headers.yaml#/CacheNoStore
```

敏感字段设计约束：

- 用户响应不应包含 `password_hash` 或其他密码材料。
- API Key 常规读取只返回脱敏字段，例如 `display_key`。
- 明文 key 只应在创建或重置时一次性返回。
- 列表接口应避免返回原始 credential、headers、auth 等敏感配置。

## 字段命名和类型约定

- JSON 字段统一使用 `snake_case`。
- 时间字段使用 `format: date-time`。
- 错误码使用 `UPPERCASE_SNAKE_CASE`。
- 列表安全字段与详情字段应区分，避免在列表中泄露敏感数据。
- 新增响应字段优先保持可选，除非后端保证所有数据都能稳定提供。

## 与其他仓库的关系

本仓库通常需要和相邻仓库一起工作：

```text
workspace/
  contracts/
  web/
  manager/
  executor/
```

关系如下：

| 仓库 | 关系 |
| --- | --- |
| `web` | `generate:ts` 输出 `../web/src/types/generated.ts`。 |
| `manager` | `check-paths` 读取 `../manager/cmd/management/main.go`；Go API 类型由 `oapi-codegen` 生成到 `../manager/internal/management/apigen/types.gen.go`；错误码生成到 `../manager/internal/management/apigen/error_codes.gen.go`。 |
| `executor` | 错误码生成到 `../executor/internal/errorcodes/error_codes.gen.go`。 |

如果这些仓库不在相邻目录，相关生成或检查命令可能失败，或写入非预期位置。

## 常见变更场景

### 新增接口

1. 在 `openapi/paths/*.yaml` 中新增 path。
2. 必要时在 `openapi/schemas/*.yaml` 中新增 request/response schema。
3. 确认 path 符合 `/api/v1/{scope}/{category}/{type}/{action}`。
4. 确认响应使用 envelope，错误响应使用 `ApiErrorResponse`。
5. 运行 `pnpm run validate`、`pnpm run generate`。
6. 若 manager 已实现或同步实现，运行 `pnpm run check-paths`。

### 修改响应字段

1. 找到对应 response schema。
2. 优先做向后兼容的可选字段新增。
3. 如果字段可能为 `null`，schema 必须显式允许 `null`。
4. 更新 examples，确保 example 与 required/nullable 语义一致。
5. 运行校验和生成命令。

### 修改错误码

1. 编辑 `openapi/schemas/common.yaml`。
2. 同步维护错误码描述、分类、建议动作。
3. 运行 `pnpm run generate:error-codes`。
4. 检查 manager/executor 中生成结果。

## 注意事项

- `openapi/` 是单一事实来源。
- 不要手动编辑 `bundled.yaml` 和跨仓库生成文件。
- 修改 spec 后至少运行 `pnpm run validate`。
- 需要刷新前端类型或错误码时运行 `pnpm run generate`。
- `pnpm run generate` 不等于完整验证；它不包含 Redocly lint、`check-paths` 和 Go API 类型生成。
- 新增 route 前应先审查已有 URL/path 约定和 operationId 命名。
- 列表响应应明确空态语义：无数据时 `items: []`，`total: 0`。
- `/api/v1/*` 和 OpenAI-compatible `/v1/*` 是不同错误格式边界，不要混用。
