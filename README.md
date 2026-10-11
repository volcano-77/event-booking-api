# 活动预约 API 测试

活动预约 API 与测试项目，包含 11 个 REST API、MySQL 三表、Postman/Newman 自动化、SQL 验证及有限并发检查。仓库提供可执行测试资产、脱敏证据、缺陷记录和结果边界。

## 当前状态

| 层次 | 内容 | 状态 |
| --- | --- | --- |
| 系统已实现 | 注册/登录、JWT、User/Organizer、活动归属、容量、预约/取消/重约、OPEN/CLOSED、OpenAPI | 已实现 |
| 自动化已验证 | 2026-10-09 完整回归：143 请求、418 断言，0 失败、0 跳过 | 有真实证据 |
| 补充已验证 | 24 项检查（含 1 项数据准备、15 项并发轮次、7 项 DB、1 项已开始场景）；3 项缺陷回归；13 组 SQL 观察 | 有真实证据 |
| 缺陷闭环 | 人数类型、UTC 时间戳、OpenAPI YAML 三个问题 | 已复现、修复、回归 |
| 手工材料 | 保留原 63 条手工用例，多组输入不能由单次自动化代替 | Not Run（未逐条人工执行） |
| 未验证范围 | 生产压测、长稳、多实例、数据库故障注入、全面渗透、Postman GUI 人工执行 | 未执行 |

完整过程见 [实际测试报告](reports/test-summary-2026-10-09.md)。2026-10-11 在新隔离实例复核同一范围：143 请求、418 断言、24 项补充检查、3 项缺陷回归和 13 组 SQL 观察，结果见[本轮证据](evidence/runs/2026-10-11T01-25-31-505Z-c17380/manifest.json)。首轮失败证据保留，不宣称系统不存在其他问题，也不将负向预期响应当作 Bug。

## 一键复现

前置：Git、Node.js（本机已验证 24.12.0，最低声明 20，其他版本未逐一实测）、MySQL 8.0 的 mysqld 服务端程序、可访问依赖 registry 的网络，以及项目目录写权限。本机验证平台为 Windows x64 / PowerShell；其他电脑、macOS/Linux、其他 MySQL 版本尚未实机验证。已有 MySQL 服务无需停止，也无需它的密码。

获取本仓库 main 分支的完整 Git 工作副本，并进入项目目录：

~~~powershell
git clone https://github.com/volcano-77/event-booking-api.git
Set-Location event-booking-api
npm ci --include=dev
$env:EVENT_BOOKING_ALLOW_TEST_WRITES = 'YES'
npm run test:local
~~~

默认查找 Windows MySQL Server 8.0/bin，安装位置不同时设置 MYSQL_BIN。每轮创建全新数据目录、独立动态端口、仅回环监听，不连接已有数据库，不清空/删除数据。关闭操作仅针对本轮生成的测试活动。完成后停止本轮服务，保留脱敏证据和被忽略的数据目录。

详细命令、独立 Newman、错误排查、目录保留说明见 [运行指南](docs/running-tests.md)。

最终验收与从零安装验证见 [验收报告](reports/acceptance-2026-10-09.md)。本机独立副本的验证不等同于另一台物理电脑实测。

### 手工 Postman 检查

~~~powershell
$env:EVENT_BOOKING_ALLOW_TEST_WRITES = 'YES'
npm run test:lab
~~~

只启动新的隔离实验室，不自动测试。导入仓库 Collection 和终端提示的本地环境文件，按文件夹顺序手工发送。实验室环境含本地临时密码，不要分享。结束后在运行终端按 Ctrl+C。这个启动/停止流程已实际检查，但尚未进行 Postman GUI 人工执行。

## 业务与接口

Organizer 发布有限名额的活动，User 浏览、预约、取消；取消释放名额，重约复用原记录。Organizer 只能管理自己创建的活动。关闭活动后不能新预约或修改，已有预约仍可取消。公共注册固定创建 User，Organizer 由管理员本地脚本准备。

| Method | URL | 访问者 | 用途 |
| --- | --- | --- | --- |
| POST | /api/auth/register | 公开 | 注册 User |
| POST | /api/auth/login | 公开 | 登录获得 JWT |
| GET | /api/events | 公开 | 活动列表、ACTIVE 人数 |
| GET | /api/events/:id | 公开 | 活动详情 |
| POST | /api/events | Organizer | 创建 OPEN 活动 |
| PUT | /api/events/:id | 活动所属 Organizer | 编辑字段、限制缩容 |
| PATCH | /api/events/:id/close | 活动所属 Organizer | 关闭活动 |
| POST | /api/events/:id/book | User | 新预约/重新预约 |
| DELETE | /api/events/:id/book | User | 逻辑取消自己的预约 |
| GET | /api/bookings/me | User | 查看自己的 ACTIVE/CANCELLED |
| GET | /api/events/:id/bookings | 活动所属 Organizer | 查看该活动预约 |

所有受保护接口使用 `Authorization: Bearer <token>`。JWT 验签后从数据库获取当前角色；伪造 role 字段不能变成 Organizer。没有前端、支付、邮件或生产部署功能。

## 数据与容量设计

- users 保存身份、bcrypt 密码、user/organizer 角色。
- events.organizer_id 指向 users；一个 Organizer 可有多个活动。
- bookings 同时关联 user_id/event_id，UNIQUE(user_id,event_id) 保证同用户同活动只有一行。
- ACTIVE 消耗名额，CANCELLED 不消耗；重约将同一行恢复为 ACTIVE。
- 预约、取消、缩容、关闭在事务中先锁活动行，再检查/修改。失败回滚，不仅依靠客户端人数判断。
- 外键、唯一约束、InnoDB 行锁各自承担不同职责；有限并发结果不等于任意负载无超卖保证。
- 日期使用 UTC 驱动转换及 UTC 数据库会话；active_bookings 按契约返回整数，ID 以字符串返回。

见 [业务规则](docs/business-rules.md)、[数据库设计](docs/database-design.md)、[API 说明](docs/api-spec.md)。服务运行时 Swagger 位于 /api/docs，OpenAPI 位于 /api/openapi.yaml。

## 测试资产导航

| 入口 | 内容 |
| --- | --- |
| [测试计划](docs/test-plan.md) | 依据、范围、方法、数据、入口/出口、暂停条件 |
| [手工用例](test-cases/api-test-cases.md) | 原 63 条用例，保留编号与 Not Run |
| [自动化目录](test-cases/automated-cases.md) | 117 条扩展请求的输入场景与预期，另有原 26 条请求 |
| [并发/DB 用例](test-cases/concurrency-and-db.md) | 有限竞争与 SQL 不变量、明确限制 |
| [Postman](postman/README.md) | Collection、环境、自动提取 Token 与依赖 |
| [Newman](scripts/newman/README.md) | 隔离/独立运行、脱敏输出 |
| [SQL](sql-validation/README.md) | 只读模板及自动验证 |
| [实际证据](evidence/README.md) | 首轮失败、独立复现、完整回归索引 |
| [真实缺陷](bug-reports/README.md) | 三个已关闭问题及回归链接 |
| [测试报告](reports/test-summary-2026-10-09.md) | 实际范围、统计、未执行项、修改清单 |
| [项目导览](docs/project-guide.md) | 验证路径、关键检查点与代码入口 |

## 命令

| 命令 | 行为 |
| --- | --- |
| npm run test:collection | 更新扩展 Collection 与自动化目录，不发送请求 |
| npm run test:local | 新隔离实例中执行完整测试 |
| npm run test:local -- --probe | 新隔离实例中执行三个针对性缺陷检查 |
| npm run test:lab | 新隔离手工实验室，等待 Ctrl+C，不自动测试 |
| npm run test:api | 对自己已启动的本机专用 API 执行 Newman，需 A/B Organizer 环境变量 |

## 普通开发启动（可选）

若要独立运行服务：复制 .env.example 为 .env，填写专用数据库参数和至少 32 字符随机 JWT_SECRET；npm run db:init 创建库表（不会重置已有记录），npm start 启动服务。Organizer 用临时 ORGANIZER_PASSWORD 环境变量和 npm run create:organizer -- <username> <email> 创建。不要使用生产数据库或真实账号。

npm run smoke 是原开发检查，会清理其创建的数据，本轮未运行；不要在不理解数据删除范围时执行。本仓库的执行证据来自上述隔离运行器。

## 技术与安全

Node.js、Express、mysql2/MySQL 8、bcrypt、jsonwebtoken、OpenAPI、Postman/Newman；并发使用原生 fetch，无额外框架。

.env、node_modules、.runtime、日志和本地环境导出被 Git 忽略。测试运行不自动 git add/commit/push。报告不存密码、JWT、数据库 dump；共享前仍应人工审查。初始化的数据目录可能较大，清理是独立删除操作，不自动执行。

部分开发与测试资产使用 AI 工具辅助完成，验证结果与限制以仓库记录为准。
