# BUG-001：活动人数的 JSON 类型与契约不符

- 状态：Closed，已修复并回归（2026-10-09）。
- 严重程度：Minor；优先级：Medium。计数值正确，但严格客户端/契约断言会失败。
- 来源：AUTO-113（后续插入用例前后编号保持该条稳定）、REG-COUNT。
- 环境：Node 24.12.0、MySQL 8.0.42、mysql2 3.24.4；未提交工作树，源码哈希见各轮 manifest。

## 复现

1. Organizer 登录，在全新隔离库创建容量 1 的未来活动。
2. GET /api/events/:id。
3. GET /api/events。
4. 对照 docs/openapi.yaml 的 active_bookings: integer。

预期：没有预约时返回数字 0。
实际：两接口均返回字符串 "0"；存在预约时也是 "1"/"2"。首轮断言信息：expected '1' to be a number。

证据：[首轮 newman.json](../evidence/runs/2026-10-09T13-10-16-694Z-7e89af/newman.json) 的 AUTO-113 以及 09/21 请求；[独立复现](../evidence/runs/2026-10-09T13-13-20-568Z-7b6dd1/regression-probe.json) REG-COUNT。

## 根因、修复与回归

连接池开启 bigNumberStrings；COUNT/COALESCE 结果由 mysql2 返回字符串。活动查询直接返回数据库行，未进行契约转换。

src/routes/event.routes.js 在列表和详情统一转换 active_bookings 为 Number。当前容量上限为 100000，人数在安全整数范围；ID 仍按字符串保留。

[完整回归](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/regression-probe.json) REG-COUNT 返回数字 0；143 请求的 Newman 断言无失败。没有将断言改成允许字符串来规避问题。
