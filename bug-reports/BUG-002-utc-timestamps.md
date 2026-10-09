# BUG-002：数据库会话时区导致时间戳偏移 8 小时

- 状态：Closed，已修复并回归（2026-10-09）。
- 严重程度：Major；优先级：Medium。
- 影响：created_at/updated_at 的 ISO 时刻错误，影响用户理解、记录比对与审计；本轮未发现因此导致超卖。
- 来源：首轮真实时间证据，独立 REG-TIME 复现。
- 前置：MySQL global time_zone=SYSTEM，系统时区 +08:00；驱动 timezone='Z'。

## 复现

1. 使用未设置 session time_zone 的原连接池启动应用。
2. Organizer 创建活动，立即 GET 详情。
3. 将请求开始/结束时间与 created_at 的 UTC 时刻比较。

预期：活动创建时刻落在请求时间窗口附近。
实际：请求时间 2026-10-09T13:13:32.871Z，返回 created_at=2026-10-09T21:13:32.880Z，偏移约 28800 秒。

[独立复现证据](../evidence/runs/2026-10-09T13-13-20-568Z-7b6dd1/regression-probe.json) 同时记录 NOW、UTC_TIMESTAMP、session/global 时区。这些是驱动读取后的观察，其中原 session 的本地值被按 UTC 解释，不能把 21:13Z 当作真实创建时间。

## 根因与最小修复

mysql2 的 timezone='Z' 只控制 JavaScript Date 与数据库值的转换，不会替 MySQL 设置会话时区。TIMESTAMP 返回的是 session 本地时间，驱动把 +08:00 本地值当作 UTC 转换，产生偏差。

src/db/connection.js 对每个新连接排在首个业务查询之前执行 SET time_zone='+00:00'，保留 driver UTC。隔离运行器自身的 SQL 连接也设置 UTC，以便正确比对；没有改服务器全局时区来隐藏问题。

## 回归

[修复后证据](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/regression-probe.json)：

- global 时区仍为 SYSTEM。
- session 时区为 +00:00。
- 实际创建时间 13:15:15.917Z，响应结束 13:15:15.926Z，差约 -0.009 秒。
- Newman 新增活动和预约时间戳的窗口断言通过。
- DB-005 验证取消/重约 ID、created_at 稳定及 updated_at 更新。

旧测试数据目录保留，未对旧库做时区迁移或历史数据修正。
