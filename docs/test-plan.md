# 接口测试计划

## 目标与状态

目标：验证现有 11 个 REST API 的正常流程、异常处理、参数边界、JWT、角色和对象权限、容量控制、状态流转及数据库一致性。

本计划是设计资产，执行结果按运行编号存档：[实际执行报告](../reports/test-summary-2026-10-09.md)。原 63 条手工用例保留 Not Run，不以自动化结果冒充人工逐条执行。自动化请求、并发场景与原手工用例数量不同，不能相加成“总用例通过率”。

## 测试依据

- docs/business-rules.md、docs/api-spec.md、docs/openapi.yaml。
- src/routes/ 的实际接口、src/validators/index.js 的精确边界、src/middleware/auth.js 的鉴权。
- src/db/schema.sql 的外键、唯一约束和容量约束。
- 需求和实现不一致时保存证据，记录缺陷后修复并回归，不通过修改断言隐藏差异。

## 范围与风险

| 范围 | 核心风险 | 资产 |
| --- | --- | --- |
| 注册、登录 | 越权选择角色、重复身份、密码边界与泄露、错误凭据 | TC-AUTH；AUTO 注册/登录 |
| JWT | 缺失、格式错误、签名篡改、过期、算法、主体、伪造角色 | AUTO 鉴权矩阵及隔离签名夹具 |
| 活动查询 | 公共访问、非法和不存在 ID、OPEN/CLOSED 可见、人数类型与 UTC 时间 | TC-EVT-Q；AUTO 查询与回归 |
| 活动管理 | User 越权、Organizer 非所有者、参数校验、缩容回滚、关闭 | TC-EVT-M；AUTO；DB-006 |
| 预约与取消 | 满额、重复、释放、重新预约复用同一行、已开始及 CLOSED | TC-BKG；主业务链；API-STARTED |
| 数据隔离 | A 无法取消 B；个人列表不含他人；Organizer 只能查自己活动 | AUTO；TC-E2E-003 |
| 并发 | 多人抢位、同用户重复、缩容竞争、关闭竞争、重复取消 | CONC-001..005 |
| 数据一致性 | ACTIVE≤capacity、唯一行、外键、密码哈希、回滚与时间戳 | DB-001..007；SQL 模板 |

不包含：UI、支付、邮件、生产部署、正式渗透、压力/长稳/多实例测试及数据库故障注入。有限并发不能证明任意负载下安全。

## 方法

1. 等价类：合法/非法类型、缺字段、多余字段、无效 Token、角色组合。
2. 边界：username 2/3/50/51；密码 7/8/72/73 与 UTF-8 字节；title 0/1/120/121；description 0/2000/2001；capacity 0/1/100000/100001；严格 ID 和时间。
3. 决策组合：OPEN/CLOSED/已开始 × ACTIVE/CANCELLED/未预约 × 容量是否剩余。
4. 业务链：注册→登录→创建→预约→重复/满额→取消→重约→他人占位→关闭。
5. 并发：每个场景独立活动、并行发请求、比较允许的串行结果，SQL 验证最终不变量。
6. 证据：HTTP 状态、错误码、关键字段、数据库快照、真实时间与源码哈希。

## 环境与数据

采用 Node.js、现有 Newman、MySQL 8。test:local 每次从 schema 创建全新独立实例，动态端口且仅回环监听，生成两个 Organizer、公共注册用户和未来活动；不连接已有数据库。已开始活动无法由 API 创建，使用隔离库 INSERT 夹具明确标注。

不执行 DROP/TRUNCATE/SQL DELETE；HTTP DELETE 仅逻辑取消预约。关闭仅限授权的本轮测试活动。停止进程后数据目录保留。密码、JWT secret、Token 仅内存使用，实验室模式的本地环境导出例外（被忽略，含凭据，禁止分享）。

## 入口、出口和暂停

入口：依赖可用、mysqld 存在、独立实例可启动、三表可建、API 就绪、Organizer 夹具可登录。缺失前置标 Blocked，不填业务 Fail。

出口：选定自动化范围执行结束，失败已检查和复现，脱敏证据齐全，缺陷回归有独立记录，未运行范围与并发限制明确。报告不宣称完整人工覆盖。

暂停条件：凭据缺失、需要删除已有数据、无法隔离、超出授权范围、服务/数据库启动失败。普通代码或脚本问题自行排查。缺陷修复前后的记录分别保留，不覆盖首轮失败。

## 执行与交付

执行命令、手工环境及故障排查：[running-tests.md](running-tests.md)。

- 手工目录：test-cases/api-test-cases.md。
- 扩展自动化：test-cases/automated-cases.md（从 Collection 构建脚本生成）。
- 并发与 SQL：test-cases/concurrency-and-db.md。
- 证据：evidence/runs/，每轮 manifest 区分源码版本和未提交改动。
- 缺陷：bug-reports/，仅记录真实复现的问题。
- 报告：reports/，模板与实际报告分开。
