# 项目导览

## 实现与验证范围

本项目包含 11 个 REST API、MySQL 三张表，以及围绕鉴权、角色、活动归属、参数边界、容量和预约状态的测试资产。Postman/Newman 自动化与 SQL 查询用于核对接口行为和数据库状态。隔离运行器可在本地启动独立实例并生成脱敏证据。

2026-10-09 的完整回归记录为 143 个请求、418 条断言；另有 24 项补充检查、3 项缺陷回归和 13 组 SQL 观察。原 63 条手工用例尚未逐条人工执行。详细结果与限制见 [测试报告](../reports/test-summary-2026-10-09.md) 和 [验收报告](../reports/acceptance-2026-10-09.md)。有限单机并发检查不能代替生产压力、安全或多实例测试。

部分开发与测试资产使用 AI 工具辅助完成，验证结果与限制以仓库记录为准。

## 复现路径

1. 按 [运行指南](running-tests.md) 准备 Node.js 与隔离 MySQL 环境。
2. 按运行指南设置写入确认变量后运行 `npm run test:local`，检查本轮生成的 Newman、并发/DB、OpenAPI 和回归证据。
3. 如需手工检查，运行 `npm run test:lab`，导入本轮本地环境与 Collection；该命令只启动隔离实验室，不自动执行用例。
4. 对照 [手工用例](../test-cases/api-test-cases.md)、[SQL 模板](../sql-validation/README.md) 和 [缺陷记录](../bug-reports/README.md) 核对结果。

## 关键检查点

- 注册、登录与 Bearer Token；401 鉴权失败和 403 权限拒绝。
- User/Organizer 角色权限，以及 Organizer 对活动的对象级归属权限。
- 容量边界、重复预约、取消和重约；数据库唯一约束与 ACTIVE 人数。
- 事务、事件行锁、提交与回滚；有限并发下的结果不变量。
- UTC、ISO 8601、驱动与数据库会话时区；人数响应类型。
- 预期负向响应、脚本前置失败和产品缺陷的区分。
- Fail、Blocked、Not Run 的记录口径，以及首轮失败与修复后回归证据的对应关系。

## 关键代码入口

| 文件 | 内容 |
| --- | --- |
| [src/routes/auth.routes.js](../src/routes/auth.routes.js) | 注册、密码哈希、登录与 JWT |
| [src/middleware/auth.js](../src/middleware/auth.js) | 验签、过期和角色检查 |
| [src/routes/event.routes.js](../src/routes/event.routes.js) | 活动归属、缩容、关闭与人数响应 |
| [src/routes/booking.routes.js](../src/routes/booking.routes.js) | 预约、取消、重约和事务 |
| [src/validators/index.js](../src/validators/index.js) | 字段、ID、容量和时间校验 |
| [src/db/schema.sql](../src/db/schema.sql) | 三表、唯一约束、外键和索引 |
| [src/db/connection.js](../src/db/connection.js) | 连接池与 UTC 设置 |
| [scripts/testing/run-local.js](../scripts/testing/run-local.js) | 隔离环境、证据生成和退出流程 |
