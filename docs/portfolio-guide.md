# 求职展示与后续学习

## 可以诚实展示的项目介绍

“这是一个活动预约接口测试作品集，包含 11 个 REST API、MySQL 三张表。我围绕鉴权、角色、活动归属、参数边界、容量和预约状态设计用例，维护 Postman/Newman 自动化，并用 SQL 核对结果。项目有隔离数据库运行器和真实脱敏证据。本地完整回归执行了 143 个请求、418 条断言，以及有限并发和数据库检查；测试发现的三项契约/时区/文档问题已记录、修复并回归。”

本项目由工具辅助建设和执行。自己尚未理解的设计或代码不要说成独立完成；学习后可以说明自己如何复现、分析和维护。不能说做过生产压测、企业线上项目、团队质量负责人或独立完成所有开发。

## 推荐展示顺序（约 5 分钟）

1. README：业务和 11 接口，不先讲框架。
2. test-plan：为什么重点测权限、最后一位、取消/重约。
3. Postman 主链：展示变量、登录后取 Token、动态 ID、一个 409 断言。
4. SQL：取消后 ACTIVE 减少、重约还是同一行。
5. BUG-002：用真实时间窗口说明 8 小时偏差如何发现，为什么单设 driver timezone 不够。
6. 报告：首轮失败、独立复现、完整回归的证据区别和有限并发限制。

## 网课学完从这里开始

先 npm run test:lab，导入本轮本地环境和 Collection。第一遍手工逐个 Send，不直接点击全量运行：

- 注册 A → 登录 A，看看响应 Token 如何传入 Authorization。
- Organizer 创建容量 1 活动 → A 预约 → B 再预约。
- A 取消 → B 再预约，对照 SQL ACTIVE 数。
- A/B Organizer 分别访问同一活动，观察 403 NOT_EVENT_OWNER。
- 发送 capacity=0、"1"、1.5，解释“数值范围”和“数据类型”不同。
- 再读 AUTO 用例的断言，运行 Newman，定位一条请求到证据中的同名条目。
- 最后读并发检查，不先研究全部开发代码。

## 必须逐步理解的知识清单

- HTTP Method、URL、header、JSON body、状态码和业务错误码的区别。
- 201 新预约与 200 重约；PUT 全量编辑字段；DELETE 在这里是逻辑取消，不删行。
- JWT 的签名、过期时间、Bearer 格式；401 鉴权失败与 403 没权限。
- User/Organizer 的角色权限与“是不是这场活动的主人”的对象权限。
- Postman 环境变量、作用域、预请求脚本、Token 提取、请求依赖、assertion。
- 等价类与边界：capacity=0/1/100000/100001；数字 1 与字符串 "1"。
- users 1→多 events（Organizer），users 1→多 bookings，events 1→多 bookings；用户与活动通过 bookings 建多对多。
- ACTIVE 占位，CANCELLED 不占位，重约复用唯一 user_id/event_id 行。
- 事务、事件行锁、唯一约束、提交/回滚；并发最终不变量 ACTIVE≤capacity。
- SQL SELECT/JOIN/GROUP BY/COUNT；左连接无数据与 NULL；为什么分组查询可能返回零行。
- UTC、ISO 8601、驱动时区与数据库 session 时区；JavaScript 字符长度与 UTF-8 字节数。
- 预期负向响应不是 Bug；脚本前置失败不是产品缺陷；Fail、Blocked、Not Run 的区别。
- 缺陷的预期、实际、环境、复现步骤、严重程度、证据、修复和回归闭环。
- Git diff、暂存/提交、.gitignore、环境与证据脱敏；不要提交运行后的环境文件。
- 作品集结论的边界：本机有限竞争不能代替线上压力与安全测试。

## 重点代码文件

| 文件 | 学习重点 |
| --- | --- |
| src/routes/auth.routes.js | 注册固定 user、bcrypt、登录签发 JWT |
| src/middleware/auth.js | 验签/过期/数据库取角色、角色检查 |
| src/routes/event.routes.js | 活动归属、缩容、关闭、人数响应类型 |
| src/routes/booking.routes.js | 锁活动→查状态/重复/人数→写预约→提交，取消和重约 |
| src/validators/index.js | 字段白名单、ID、边界、时间 |
| src/db/schema.sql | 三表、唯一约束、外键和索引 |
| src/db/connection.js | 连接池、UTC 驱动和会话设置 |
| scripts/testing/run-local.js | 安全隔离环境、证据、退出和停止服务 |

不需要现在先掌握全部内容；这些材料用于后续按网课进度逐步对照学习。
