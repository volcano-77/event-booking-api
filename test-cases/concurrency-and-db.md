# 并发与数据库用例

定义状态均为 Not Run；实际执行状态仅记录在对应 evidence/runs/<run-id>/concurrency-db.json。脚本：tests/concurrency-and-db.js。

来源：容量、唯一预约、取消释放、CLOSED 为 Requirement；同时到达及数据库与接口一致性为 Inferred QA Risk。前置：全新隔离数据库、两个 Organizer、主业务链生成的 User A；脚本自动注册并登录 12 位额外 User。需要状态变化的场景使用独立新活动，避免上条占位干扰；数据准备及全库不变量检查以本轮隔离库为范围。

| ID | 优先级 | 步骤/数据 | 明确预期 | 定义状态 |
| --- | --- | --- | --- | --- |
| SETUP-USERS | High | 通过 API 创建并登录 12 个不同用户 | 注册 201、登录 200，获得可用用户 Token；前置失败则后续标 Blocked | Not Run |
| CONC-001-R1..R5 | High | 1. 新建容量 3 活动；2. 12 个用户用 Promise.all 同时预约；3. 查询 ACTIVE 数，共 5 轮 | 每轮 3 个 201、9 个 409 EVENT_FULL；数据库恰有 3 条 ACTIVE，无超卖 | Not Run |
| CONC-002 | High | 1. 容量 3；2. 同一 User 同时提交 8 次预约；3. 查该活动预约行 | 1 个 201、7 个 409 ALREADY_BOOKED；只有 1 行、1 个 ACTIVE | Not Run |
| CONC-003-R1..R5 | High | 1. 容量 2，A 先占一位；2. B 预约与 Organizer 将容量改为 1 同时发起，共 5 轮 | 预约先完成则 201+缩容 409 CAPACITY_BELOW_BOOKINGS；缩容先完成则 200+预约 409 EVENT_FULL；ACTIVE≤capacity | Not Run |
| CONC-004-R1..R3 | High | 1. 容量 1；2. 预约与关闭同时发起；3. 关闭后再预约，共 3 轮 | 关闭 200；竞争预约可能 201 或 409 EVENT_CLOSED；之后预约必须 409；数据库 CLOSED、ACTIVE≤1 | Not Run |
| CONC-005 | High | 1. 容量 1 已有 A；2. 同时取消两次；3. B 预约 | 一次 200、一次 409 BOOKING_CANCELLED；A 的行仍存在且 CANCELLED，B 获得空位 | Not Run |
| DB-001 | High | GROUP BY user_id,event_id 查 COUNT>1 | 0 组重复行 | Not Run |
| DB-002 | High | 统计每个活动 ACTIVE 与 capacity | 0 个超容量活动 | Not Run |
| DB-003 | High | LEFT JOIN 查无 Organizer/User/Event 的引用 | 0 个孤立活动、0 个孤立预约 | Not Run |
| DB-004 | High | 查询本轮 12 个公共注册用户的角色；本地 bcrypt.compare 验证 | 全为 user，均为 bcrypt 且匹配本轮临时密码；不导出密码哈希 | Not Run |
| DB-005 | High | 1. 预约；2. SQL 快照；3. 取消；4. SQL 快照；5. 重新预约；6. SQL 快照 | ID 与 created_at 稳定；取消后 ACTIVE=0；重约为同一行 ACTIVE；updated_at 反映变化 | Not Run |
| DB-006 | High | 1. 容量 2 已约满；2. 读取字段快照；3. 修改标题并缩容到 1；4. 再次查库 | 409 CAPACITY_BELOW_BOOKINGS；所有活动可编辑字段均未改变 | Not Run |
| API-STARTED | High | 1. 仅隔离库插入已开始活动；2. API 预约；3. 夹具插入该用户 ACTIVE；4. API 取消 | 预约 409 EVENT_STARTED；已开始仍可取消 200、ACTIVE=0 | Not Run |
| DB-007 | High | API 查询全部活动；与 SQL ACTIVE 统计逐项比较 | 集合数量和每个活动 ACTIVE 数一致 | Not Run |

## 并发范围与限制

这是单机、单 Node 进程、单 MySQL 实例的有限竞争测试。Promise.all 让多个请求在客户端并行发出，不保证数据库的到达顺序，也不保证线程在同一纳秒执行。因此只断言业务允许的两类串行结果，不断言谁一定先成功。

它可以发现本次工作负载下的超卖、重复行、错误冲突或回滚异常，不能证明所有调度、死锁重试、网络中断和线上高负载都安全。未执行压力、长稳、数据库故障注入或分布式多实例测试。没有为展示而引入 JMeter 等额外工具。

## SQL 手工练习

sql-validation/validation-queries.sql 可独立学习。执行前填写本轮真实 ID；B-01 分组查询在尚未预约时返回 0 行（并非返回 row_count=0 的一行）。一键运行器会填充本轮 ID 后实际执行模板，并另存观察结果。不要用别的数据库的 ID 填入。
