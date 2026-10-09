# 补充自动化

- concurrency-and-db.js：原生 fetch 并发请求 + mysql2 只读验证，有限场景，不是压力测试。
- regression-probe.js：三项真实缺陷的针对性复现/回归：人数类型、UTC 时间、OpenAPI Response Object。
- 入口 scripts/testing/run-local.js 负责全新 MySQL 数据目录、夹具、应用生命周期与脱敏证据。
- Postman/Newman 主范围在 postman/，原手工目录在 test-cases/。

运行 npm run test:local 前设置 EVENT_BOOKING_ALLOW_TEST_WRITES=YES。这些 JS 模块依赖隔离环境，不应直接导入真实业务数据库执行。详情见 docs/running-tests.md。

已执行结果见 reports/test-summary-2026-10-09.md；模块定义本身不代表每次都通过。
