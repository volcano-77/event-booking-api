# 活动预约 API 测试建设与实际执行报告

> 本报告记录项目建设阶段，文件数量及“未执行”项是当时快照。之后的最终验收、脚本修复和补充执行见 [验收报告](acceptance-2026-10-09.md)。两条历史 manifest 的 command 字段曾硬编码错误，正确命令见 [元数据更正](../evidence/acceptance/2026-10-09/historical-command-errata.json)；原始结果和哈希保留不变。

## 1. 已完成内容

- 检查原有 5 个提交、项目结构、代码、11 接口、OpenAPI、三表设计和测试材料；开始时 main 工作区与暂存区干净。
- 保留原 63 条手工用例、原 26 个 Postman 请求与业务链；新增 117 个扩展请求，Collection 共 143 个。
- 补齐 JWT/角色矩阵、Organizer 归属、参数/边界、非法 ID、重复/满额/取消/重约/CLOSED、已开始、个人数据隔离和人数/时间契约检查。
- 使用现有 Newman、原生 fetch、mysql2/bcrypt，不新增测试框架或第三方项目依赖。npm ls --depth=0 确认现有依赖可用，未进行不必要的重新安装。
- 新建安全隔离运行器、手工 Postman 实验室、有限并发与数据库断言；每轮独立 MySQL 数据目录、动态端口、回环监听，自动停止自己的服务，保留数据。
- Newman 使用程序化接口，仅输出脱敏的选择字段；替换旧的原始 JSON/JUnit 导出，避免报告夹带密码/Token。
- 真实发现三项问题，独立复现、最小修复、完整回归；修复前失败记录保留。
- 更新中文 README、测试计划/范围、执行说明、SQL 文档、缺陷记录、证据索引、报告模板和项目导览。

## 2. 环境与源码识别

| 项目 | 实际值 |
| --- | --- |
| 日期/时区 | 2026-10-09；Asia/Shanghai，表中执行时间为 UTC+08:00 |
| 操作系统 | Windows / PowerShell |
| Node.js / npm | v24.12.0 / 11.6.2 |
| Newman | 6.2.2 |
| MySQL / mysql2 | 8.0.42 / 3.24.4，InnoDB |
| 数据库 | 每轮新建 event_booking_isolated，使用不同数据目录与端口 |
| 完整回归 API / DB | http://127.0.0.1:11375 / 127.0.0.1:11360（该轮结束后已停止） |
| 原 Git HEAD | 3a2ab14612b50b94cd97d008205413e25c60c2f7 |
| 分支 | main |

测试针对未提交的工作树执行，不把原 HEAD 冒充修改后代码版本。每轮 manifest 保存实际被测文件 SHA-256。建设完成时检查确认 src、测试 JS、运行器 JS、Collection/环境 JSON、SQL、OpenAPI 和 package 的已记录哈希与该轮回归一致；此后验收修复了运行器元数据与判定逻辑，最新版本和新验证见 [最终验收](acceptance-2026-10-09.md)，不能继续将本轮哈希当作验收后的脚本哈希。

MySQL 系统时区仍为 SYSTEM；应用和验证连接各自设置 UTC 会话。没有通过修改已有 MySQL 服务或全局时区绕过时间问题。

## 3. 实际执行记录

| 运行编号（证据目录） | 开始—结束时间（UTC+08:00） | 实际结果 |
| --- | --- | --- |
| [2026-10-09T13-10-16-694Z-7e89af](../evidence/runs/2026-10-09T13-10-16-694Z-7e89af/manifest.json) | 21:10:16.701—21:10:49.884 | 首轮 Fail：141 请求、412 断言，1 条断言失败；24 项补充检查 Pass；OpenAPI 字段审查 Fail |
| [2026-10-09T13-13-20-568Z-7b6dd1](../evidence/runs/2026-10-09T13-13-20-568Z-7b6dd1/manifest.json) | 21:13:20.575—21:13:32.926 | 针对性独立复现：人数类型、时间戳、OpenAPI 三项均 Fail |
| [2026-10-09T13-14-52-379Z-381c55](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/manifest.json) | 21:14:52.386—21:15:23.389 | 修复后完整回归 Pass：143 请求、418 断言，0 失败、0 pending、0 跳过；24 项补充检查 Pass；3 项缺陷回归 Pass；OpenAPI 字段审查 Pass |
| [2026-10-09T13-19-35-543Z-cd8f6c](../evidence/runs/2026-10-09T13-19-35-543Z-cd8f6c/manifest.json) | 21:19:35.550—21:19:48.736 | 实验室启动/停止实际检查：服务就绪、生成本地环境、Ctrl+C 停止；接口自动测试状态 Not Run |

完整测试命令的退出码：首轮 1、针对性复现 1、修复后完整回归 0。实验室通过 Ctrl+C 结束，外层 npm/终端返回中断码 1；其 manifest 标记 Not Run，不记成业务失败或接口通过。

两次完整范围执行均实际执行 SQL 模板，各返回 13 组结果。这是实际 SQL 观察数量，不是额外 13 条“全部通过的手工用例”。

### 最新完整回归的覆盖与证据

| 类别 | 执行内容 | 证据 |
| --- | --- | --- |
| 11 API 正向/关键链 | 注册、登录、查询、创建、修改、关闭、预约、取消、重约、个人/Organizer 列表 | newman.json 前两组与扩展请求 |
| JWT | 受保护接口缺失 Token 矩阵、格式错误、篡改、过期、算法、无效主体、伪造 role | AUTO-003..026，签名负向夹具在隔离运行器内存生成 |
| 角色/归属 | User 与 Organizer 访问组合；Organizer B 修改/关闭/查询 A 活动被拒绝 | AUTO 权限矩阵；非所有者请求 |
| 参数/边界 | 必填、未知字段、错误类型、username/密码字符与字节、标题/描述/容量、ISO 时间、严格 ID、畸形/过大 JSON | AUTO-027..090、AUTO-116/117 等；以 Collection 名称/目录为准 |
| 状态/冲突 | 重复预约、满额、释放、同一 ID 重约、重约仍受容量限制、重复取消、CLOSED 编辑/预约拒绝、已关闭/开始仍可取消 | 主链、扩展流程、API-STARTED |
| 并发 | 15 项轮次：多人抢位 5、同用户重复 1、缩容竞争 5、关闭竞争 3、双取消 1 | concurrency-db.json 的 CONC-* |
| 数据一致性 | 7 项 DB 断言：唯一行、容量、外键、角色/bcrypt、生命周期、回滚、API/SQL 人数 | DB-001..007 |
| 前置与回归 | 12 个用户数据准备 1 项；三项缺陷回归 | SETUP-USERS；regression-probe.json |

最新 [Newman 详细证据](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/newman.json)、[并发/DB 证据](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/concurrency-db.json)、[SQL 模板观察](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/sql-templates.json)。

### 并发实际观察与结论边界

- 12 人争容量 3，共 5 轮：每轮恰有 3 个预约 201、9 个 409 EVENT_FULL，数据库 ACTIVE=3。
- 同一用户并行 8 次：1 个 201、7 个 409 ALREADY_BOOKED，只有一行。
- 缩容竞争 5 轮：本轮均观察到预约先完成，缩容返回 409 CAPACITY_BELOW_BOOKINGS；最终容量 2、ACTIVE=2。
- 关闭竞争 3 轮：本轮均观察到预约先完成，随后关闭 200；关闭后的预约均被拒绝。
- 同时取消两次：1 个 200、1 个 409 BOOKING_CANCELLED，ACTIVE=0，随后他人可获得名额。

脚本接受业务允许的两种串行顺序，但本轮竞争未观察到另一种调度顺序，不能说“两种并发顺序都实际复现”。这是单机单实例的有限竞争验证，不是压力测试，也不能证明所有调度或生产负载均安全。顺序用例另已验证缩容后的满额拒绝及 CLOSED 拒绝。

## 4. 真实缺陷与当前未关闭问题

| ID | 实际问题 | 修复 | 状态 |
| --- | --- | --- | --- |
| [BUG-001](../bug-reports/BUG-001-active-count-type.md) | active_bookings 返回 "0"/"1"，契约为 integer | 查询响应仅对人数做 Number 转换 | Closed，已回归 |
| [BUG-002](../bug-reports/BUG-002-utc-timestamps.md) | 原 MySQL SYSTEM +08:00 会话被驱动按 UTC 解释，时间戳偏移约 28800 秒 | 每个池连接设置 UTC 会话，SQL 验证连接一致 | Closed，已回归 |
| [BUG-003](../bug-reports/BUG-003-openapi-yaml.md) | 注册响应的内联 description 逗号产生多余 YAML 字段 | 描述加引号，并分离请求/响应 Event schema | Closed，已回归 |

当前已知未关闭 Bug 为 0，仅限本轮范围。缺少邮件验证、密码找回、限流等未设计能力属于已知范围限制，不能据此虚构需求缺陷。所有预期 4xx 都按具体断言判断，未当作 Bug。

## 5. 环境阻塞、失败和未执行

- 当前环境阻塞：无。缺少现有 MySQL root 凭据不再阻塞，因为使用全新独立实例。
- 真实失败：保存在首轮及独立复现中，未覆盖；修复后完整回归没有断言失败。
- Node 24 加载依赖时产生 fs.F_OK 弃用提示；没有阻塞本轮运行，未屏蔽成绿色结果。
- 原 63 条手工用例没有逐条人工执行，仍为 Not Run。自动化覆盖相关行为不等于每条手工用例的所有输入变体都已验证。
- 未执行 Postman GUI 人工测试、独立 test:api 模式的整套运行、生产部署、压力/长稳、多实例、数据库故障注入及全面安全渗透。
- OpenAPI 检查针对 Response Object 字段，不宣称完整规范认证。
- 实验室模式已检查启动、环境生成与 Ctrl+C 停止，但未替用户完成手工学习执行。

## 6. 安全和证据

- 只操作新建隔离数据，关闭本轮测试活动已获得用户确认。
- 未运行 DROP/TRUNCATE/SQL DELETE；HTTP DELETE 接口只把预约标为 CANCELLED，不删行。
- 四轮自己的 API/MySQL 均已停止；最终进程检查发现本项目隔离进程数量为 0。已有 MySQL 服务未被停止。
- 数据目录全部保留在被忽略的 .runtime/；清理属于独立删除操作，本轮未执行。
- .env、.env.*（保留 .env.example）、node_modules、.runtime、日志、本地环境导出及旧本地原始证据目录均被忽略。
- 检查拟提交文件未发现实际 JWT、私钥、GitHub Token 或用户主目录路径；模板不含 Organizer 密码/Token 的运行值。公开的边界测试密码字符串是测试输入，不是真实账号凭据。
- 实验室生成的环境文件含临时测试密码，只保留在被忽略的本地目录。没有数据库 dump、虚假截图或原始 Newman 环境导出。
- 分享/提交前仍应人工复核；本轮不自动提交任何文件。

## 7. 实际执行过的主要命令

~~~powershell
git status --short --branch
git log -5 --oneline
node --version
npm --version
npm ls --depth=0
npm run test:collection
node --check scripts/testing/run-local.js
node --check tests/concurrency-and-db.js

$env:EVENT_BOOKING_ALLOW_TEST_WRITES = 'YES'
npm run test:local                 # 首轮真实失败
npm run test:local -- --probe       # 独立复现
npm run test:collection             # 加入回归断言后生成定义
npm run test:local                 # 修复后完整回归
npm run test:lab                   # 就绪后 Ctrl+C；不自动测试

git diff --check
git diff --cached --name-only
git rev-list --count HEAD
~~~

另执行了源码哈希比对、敏感模式扫描、git check-ignore 和隔离进程检查。详细一键使用及手工环境见 [运行说明](../docs/running-tests.md)。没有执行 npm run smoke（会删除其生成的数据），没有 git add/commit/push 或远程修改。

## 8. 修改文件清单

以下为项目建设完成、最终验收前的文件快照；验收阶段的新增证据和修改另见验收报告。

### 修改 21 个既有文件

- [.gitignore](../.gitignore)
- [README.md](../README.md)
- [bug-reports/README.md](../bug-reports/README.md)
- [docs/database-design.md](../docs/database-design.md)
- [docs/openapi.yaml](../docs/openapi.yaml)
- [docs/test-plan.md](../docs/test-plan.md)
- [docs/testing-scope.md](../docs/testing-scope.md)
- [evidence/README.md](../evidence/README.md)
- [package.json](../package.json)
- [postman/Event-Booking-API.postman_collection.json](../postman/Event-Booking-API.postman_collection.json)
- [postman/README.md](../postman/README.md)
- [postman/local.postman_environment.json](../postman/local.postman_environment.json)
- [reports/test-summary-template.md](../reports/test-summary-template.md)
- [scripts/newman/README.md](../scripts/newman/README.md)
- [scripts/newman/run.ps1](../scripts/newman/run.ps1)
- [sql-validation/README.md](../sql-validation/README.md)
- [sql-validation/validation-queries.sql](../sql-validation/validation-queries.sql)
- [src/db/connection.js](../src/db/connection.js)
- [src/routes/event.routes.js](../src/routes/event.routes.js)
- [test-cases/api-test-cases.md](../test-cases/api-test-cases.md)
- [tests/README.md](../tests/README.md)

### 新增 28 个文件（包含本报告、14 个真实证据文件）

- [bug-reports/BUG-001-active-count-type.md](../bug-reports/BUG-001-active-count-type.md)
- [bug-reports/BUG-002-utc-timestamps.md](../bug-reports/BUG-002-utc-timestamps.md)
- [bug-reports/BUG-003-openapi-yaml.md](../bug-reports/BUG-003-openapi-yaml.md)
- [项目导览](../docs/project-guide.md)（后续更名）
- [docs/running-tests.md](../docs/running-tests.md)
- [evidence/runs/2026-10-09T13-10-16-694Z-7e89af/concurrency-db.json](../evidence/runs/2026-10-09T13-10-16-694Z-7e89af/concurrency-db.json)
- [evidence/runs/2026-10-09T13-10-16-694Z-7e89af/manifest.json](../evidence/runs/2026-10-09T13-10-16-694Z-7e89af/manifest.json)
- [evidence/runs/2026-10-09T13-10-16-694Z-7e89af/newman.json](../evidence/runs/2026-10-09T13-10-16-694Z-7e89af/newman.json)
- [evidence/runs/2026-10-09T13-10-16-694Z-7e89af/openapi-review.json](../evidence/runs/2026-10-09T13-10-16-694Z-7e89af/openapi-review.json)
- [evidence/runs/2026-10-09T13-10-16-694Z-7e89af/sql-templates.json](../evidence/runs/2026-10-09T13-10-16-694Z-7e89af/sql-templates.json)
- [evidence/runs/2026-10-09T13-13-20-568Z-7b6dd1/manifest.json](../evidence/runs/2026-10-09T13-13-20-568Z-7b6dd1/manifest.json)
- [evidence/runs/2026-10-09T13-13-20-568Z-7b6dd1/regression-probe.json](../evidence/runs/2026-10-09T13-13-20-568Z-7b6dd1/regression-probe.json)
- [evidence/runs/2026-10-09T13-14-52-379Z-381c55/concurrency-db.json](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/concurrency-db.json)
- [evidence/runs/2026-10-09T13-14-52-379Z-381c55/manifest.json](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/manifest.json)
- [evidence/runs/2026-10-09T13-14-52-379Z-381c55/newman.json](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/newman.json)
- [evidence/runs/2026-10-09T13-14-52-379Z-381c55/openapi-review.json](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/openapi-review.json)
- [evidence/runs/2026-10-09T13-14-52-379Z-381c55/regression-probe.json](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/regression-probe.json)
- [evidence/runs/2026-10-09T13-14-52-379Z-381c55/sql-templates.json](../evidence/runs/2026-10-09T13-14-52-379Z-381c55/sql-templates.json)
- [evidence/runs/2026-10-09T13-19-35-543Z-cd8f6c/manifest.json](../evidence/runs/2026-10-09T13-19-35-543Z-cd8f6c/manifest.json)
- [reports/test-summary-2026-10-09.md](../reports/test-summary-2026-10-09.md)
- [scripts/newman/build-collection.js](../scripts/newman/build-collection.js)
- [scripts/newman/run.js](../scripts/newman/run.js)
- [scripts/testing/run-local.js](../scripts/testing/run-local.js)
- [scripts/testing/serve-isolated.js](../scripts/testing/serve-isolated.js)
- [test-cases/automated-cases.md](../test-cases/automated-cases.md)
- [test-cases/concurrency-and-db.md](../test-cases/concurrency-and-db.md)
- [tests/concurrency-and-db.js](../tests/concurrency-and-db.js)
- [tests/regression-probe.js](../tests/regression-probe.js)

package-lock.json 未修改，因为没有变更依赖；测试脚本只调整 package.json 的 scripts。业务代码仅修改 src/db/connection.js 与 src/routes/event.routes.js，分别对应真实时区与人数类型缺陷，未新增无关功能或重构。

## 9. 项目建设完成时 Git 状态（验收前快照）

- 分支：main。
- HEAD：3a2ab14612b50b94cd97d008205413e25c60c2f7，仍为原有第 5 个提交。
- 提交总数：5，未重写。
- 暂存区：空。
- 工作区：21 个修改文件、28 个未跟踪新文件；未提交的建设成果是预期状态。
- 没有自动 commit、push、fetch 或修改远程配置。

## 10. 复现路径与关键检查点

1. 运行 `npm run test:lab`，导入本地环境和 Collection，按注册、登录、活动、预约、取消与重约的顺序手工检查。
2. 核对 Method、URL、JSON、header、状态码和业务错误码；区分 401 与 403。
3. 检查动态变量、Token 提取、前置依赖、断言和 Newman 运行结果。
4. 用 capacity=0、1、100000、100001 核对边界与数据类型。
5. 用 SQL 验证 ACTIVE/CANCELLED、人数、唯一 user/event 行、ID 和时间戳。
6. 对照缺陷记录检查事务、行锁、回滚、UTC 会话与并发结果边界。
7. 区分首轮失败、针对性复现、修复后回归，以及 Fail、Blocked、Not Run。

本轮限定结论：记录的自动化范围在修复后完整回归通过；可执行环境、用例、脱敏证据和缺陷闭环均有对应记录。原 63 条手工用例尚未逐条人工执行，高负载等范围未执行。
