# 本地执行说明

## 最短路径：自动隔离执行

需要 Git（运行器记录 Git HEAD/文件清单）、Node.js 20+、MySQL 8.0 服务端程序（mysqld）、项目目录写权限和安装依赖时的网络。不需要现有 MySQL 的 root 密码，也不连接现有数据库。

实测环境为 Windows x64 / PowerShell、Node 24.12.0、MySQL 8.0.42；其他电脑/系统及其他版本未实机验证。请克隆本仓库 main 分支取得完整 Git 工作副本；ZIP 导出不含 Git 元数据，当前隔离运行器不支持直接从 ZIP 运行。历史报告中的未提交状态是执行当时的快照。

在项目目录打开 PowerShell：

~~~powershell
npm ci --include=dev
npm run test:collection
$env:EVENT_BOOKING_ALLOW_TEST_WRITES = 'YES'
# 默认查找 Windows MySQL Server 8.0/bin；安装位置不同时设置：
# $env:MYSQL_BIN = '你的 MySQL bin 目录'
npm run test:local
$LASTEXITCODE
~~~

这个命令会：

1. 在被 Git 忽略的 .runtime/运行编号/mysql-data 中初始化全新数据目录。
2. 在 127.0.0.1 空闲端口启动独立 MySQL，生成仅存在于内存中的数据库密码和 JWT secret。
3. 从 src/db/schema.sql 创建三张表，插入两个临时 Organizer（密码使用 bcrypt）。
4. 启动与正式 src/app.js 相同的应用，测试进程仅监听本机回环地址。
5. 执行 Collection、有限并发场景、数据库断言和 SQL 查询模板。
6. 输出脱敏证据到 evidence/runs/运行编号/，退出前停止本轮 API/MySQL，保留数据目录。

不会连接原有数据库，不执行 DROP、TRUNCATE 或 SQL DELETE，也不自动提交/推送。HTTP DELETE 预约接口是逻辑取消，会正常验证。关闭活动只针对刚生成的测试活动。数据库和 API 使用动态端口，端口记录在 manifest.json。

退出码 0 表示该轮定义范围内未发现断言失败；1 需要查看失败或阻塞原因。没有执行的测试不能据此填为 Pass。MySQL 启动失败时先看 .runtime/对应运行编号/mysql*.log；不要修改现有 MySQL 服务或重置它的密码。

初始化后的临时实例密码不会写入报告；停止后不提供复用该数据库的承诺，下次运行使用另一个全新目录。数据目录可能较大，清理属于删除操作，应在自己确认目录范围、无需保留后再进行。脚本不自动清理。

## 手工 Postman 学习环境

~~~powershell
$env:EVENT_BOOKING_ALLOW_TEST_WRITES = 'YES'
npm run test:lab
~~~

这是独立实验室模式：只初始化测试环境，不自动执行用例。保持终端运行，将终端提示的 .runtime/运行编号/lab.postman_environment.local.json 与仓库 Collection 一起导入 Postman，然后选择该环境，按文件夹顺序运行。

该本地环境文件包含生成的临时 Organizer 密码，已被 Git 忽略，不能分享、截图或上传。学习结束在终端按 Ctrl+C，运行器停止自己创建的服务并保留数据。实验室模式的 manifest 标记 Not Run，不作为自动测试成功证据。

## 针对自己已经启动的测试 API

~~~powershell
$env:EVENT_BOOKING_BASE_URL = 'http://127.0.0.1:3000'
$env:EVENT_BOOKING_ORGANIZER_EMAIL = '本地测试 Organizer A 邮箱'
$env:EVENT_BOOKING_ORGANIZER_PASSWORD = '本地密码'
$env:EVENT_BOOKING_OTHER_ORGANIZER_EMAIL = '本地测试 Organizer B 邮箱'
$env:EVENT_BOOKING_OTHER_ORGANIZER_PASSWORD = '本地密码'
$env:EVENT_BOOKING_ALLOW_TEST_WRITES = 'YES'
npm run test:api
~~~

只接受本机 URL。该命令会创建测试用户、活动并关闭本轮活动，因此必须指向专门的测试数据库。两位 Organizer 由本地管理员脚本准备，不能使用真实账号。运行完将这些环境变量从当前 shell 移除，关闭终端也会清除。

独立 Newman 模式不能构造正确签名的过期、不同算法、无效主体和伪造角色 JWT；对应 4 个请求会跳过并列入 notRun。test:local 会在内存中生成这 4 个负向夹具，完整执行。没有把 JWT secret 放进 Postman 模板。

## 证据如何阅读

| 文件 | 内容 |
| --- | --- |
| manifest.json | 实际时间、命令、版本、Git HEAD、测试源码 SHA-256、隔离环境、阶段和停止状态 |
| newman.json | 实际请求状态码、脱敏输入/输出、断言、失败和未运行请求 |
| concurrency-db.json | 每轮竞争请求响应及 SQL 观察；独立场景结论 |
| sql-templates.json | 用实际 ID 执行只读模板的结果集；它本身不是逐条手工用例 Pass |
| openapi-review.json | Response Object 字段审查结果；不是完整 OpenAPI 规范认证 |

不保存 Newman 原始环境导出、Authorization header、JWT、密码或数据库 dump。失败记录会原样保留其实际状态和脱敏诊断。查看报告时必须使用相同运行编号，不能把不同环境的数据拼接成一次执行。

已有 npm run smoke 会在结束时删除它创建的数据，因此不纳入此处的一键执行。首次建设中未使用该命令。

## 从零搭建与网络限制

先安装 Git、Node.js、MySQL Server（仅有 MySQL Workbench 或 mysql 客户端不够）。按 README 获取代码并进入目录，再执行 npm ci --include=dev，避免 NODE_ENV=production 时漏装 Newman。

package-lock.json 固定依赖版本和完整性，当前下载地址为 registry.npmmirror.com；新电脑需要能够访问这个 registry。网络、代理、MySQL 系统运行库和操作系统权限差异仍需在目标电脑确认。不要把本机 node_modules、.env 或 .runtime 复制过去替代安装。

验收采用同机独立 Git 副本、无现成 node_modules 和新缓存验证，详见 reports/acceptance-2026-10-09.md。它不等于跨电脑或跨系统实测。
