# SQL 验证

validation-queries.sql 是只读查询模板（SET 会话变量和 SELECT），包含身份与 bcrypt 特征、活动归属、容量、唯一预约、状态/时间戳、个人数据隔离和外键关系。

## 手工使用

1. 连接与 API 相同的专用测试库。
2. 将本轮 API 返回的 ID 填入开头变量；不要使用其他环境的 ID。
3. 查询 U-01、E-01/E-02、B-01..B-04、C-01。
4. 对照 SQL 注释中的预期验证点，保留本轮结果并脱敏。
5. B-01 首次预约前返回零行；B-02 没有预约时 ACTIVE/CANCELLED 都应为 0。密码只检查前缀/长度，不导出哈希。

## 自动执行

npm run test:local 会从本轮返回值填 ID 后执行整份模板，保存 13 组实际结果到 sql-templates.json。另外 tests/concurrency-and-db.js 对容量、唯一行、外键、角色、bcrypt、取消重约、回滚和 API/SQL 统计执行断言，并保存查询观察。

mysql2 开启 bigNumberStrings，因此 SQL COUNT 和 BIGINT 观察可能是字符串；比较计数时显式 Number 转换。公开 API 的 active_bookings 则按 OpenAPI 返回整数。日期以 UTC 会话读取，数据库原始 TIMESTAMP 也会受 session.time_zone 影响。

已执行与模板状态分开：报告见 reports/test-summary-2026-10-09.md，模板不填预制结果。不要将这些模板连接到生产数据库，不需要 DROP/DELETE/TRUNCATE。
