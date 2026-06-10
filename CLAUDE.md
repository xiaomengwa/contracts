# contracts — API 契约规范

TokenMP Management API 的 OpenAPI 规范和代码生成。

## 规则

- `openapi/` 下的 YAML 文件是 API 的单一事实来源。
- 不要手动编辑生成文件（`bundled.yaml`、`../web/src/types/generated.ts`、`../manager/internal/management/apigen/types.gen.go`）。
- 修改 spec 后必须运行 `pnpm run generate` 并提交更新的生成文件。

## 目录布局

```text
openapi/
  root.yaml         OpenAPI 3.1.0 根文件（info, servers, securitySchemes）
  schemas/          按领域拆分的 schema 定义
  paths/            按领域拆分的路径定义
scripts/
  bundle.mjs        使用 @redocly/cli 合并多文件 spec
bundled.yaml        合并后的完整 spec（提交到 git，由 bundle 生成）
```

## 常用命令

```bash
pnpm run bundle       # 合并多文件 spec → bundled.yaml
pnpm run validate     # 合并 + lint 验证
pnpm run generate:ts  # 生成 TypeScript 类型到 ../web/src/types/generated.ts
pnpm run generate     # bundle + generate:ts
```

Go 类型生成需要手动执行（需要 oapi-codegen）：

```bash
cd ../manager && oapi-codegen --config internal/management/apigen/oapi-codegen.yaml ../contracts/bundled.yaml
```

## Spec 编写规范

- OpenAPI 3.1.0，使用 `allOf` 组合 CatalogStats 等嵌入类型。
- 所有 JSON 字段使用 `snake_case`。
- 所有管理端写操作使用 POST。
- 路径风格：`/api/v1/{scope}/{category}/{type}/{action}`，分类优先，非 RESTful。能扩展的用 `分类/类型`（如 `rules/rate`），不能扩展的扁平（如 `providers`）。
- 响应统一使用 envelope：`{ code, data, message, error_code }`。
- 列表响应 data 使用 PaginatedData：`{ items, page, limit, total }`。
- 错误码使用 UPPERCASE_SNAKE_CASE 字符串。
- Schema 文件按领域拆分，路径文件按领域+角色拆分。
- `$ref` 使用相对路径引用其他文件。

## 类型架构

- **Spec 定义原始后端 shape**（含 `status` 字段）。
- **前端 normalizer** 将 `status: string` 转换为 `is_active: boolean`。
- 生成的 TypeScript 类型是原始类型；normalized 类型由 `web/src/types/index.ts` 手动维护。
