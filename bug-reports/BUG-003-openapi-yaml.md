# BUG-003：OpenAPI 注册响应解析出非法字段

- 状态：Closed，已修复并回归（2026-10-09）。
- 严重程度：Minor；优先级：Medium。
- 类型：接口文档缺陷，非注册业务执行失败。
- 来源：DOC-001、REG-OPENAPI。

## 复现

1. 用项目现有 yamljs 加载 docs/openapi.yaml。
2. 读取 paths['/api/auth/register'].post.responses['201']。
3. 检查 Response Object 的属性。

原定义在内联映射中用未加引号的 description 文本，文本包含逗号。
预期：description 是完整字符串，不产生其他属性。
实际：得到 description='User created with ID'、多余属性 'username,' 和 'and'，不符合 Response Object 约定。

证据：[首轮审查](../evidence/runs/2026-10-09T13-10-16-694Z-7e89af/openapi-review.json)；[独立复现](../evidence/runs/2026-10-09T13-13-20-568Z-7b6dd1/regression-probe.json)。

## 修复与回归

为该描述加引号。另外将 Event 响应 schema 与 additionalProperties:false 的 EventInput 请求 schema 分开，避免响应额外字段受请求约束；这些是文档修正，没有新增接口。

[完整回归的字段审查](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/openapi-review.json) 和 REG-OPENAPI 均通过，无多余属性。

审查针对 Response Object 字段，不宣称执行了完整 OpenAPI 标准认证或所有 schema 的全面规范校验。
