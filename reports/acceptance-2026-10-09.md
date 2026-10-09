# 最终验收报告

验收日期：2026-10-09（Asia/Shanghai）。  
验收结论：**通过（本地候选成果验收）**。其他物理电脑和其他系统尚未实测，已在 README 明确标注；本次没有以未验证内容冒充通过。

## 1. 验收范围与结论依据

本次只验收和修复已有测试成果，没有新增业务功能、接口或测试框架。

| 检查项 | 已核对内容 |
| --- | --- |
| 报告与证据 | 从每条 assertion 重新汇总统计，核对请求数、失败、跳过、SQL 结果组、补充检查和三项缺陷回归 |
| 文档/用例/脚本 | 11 接口、143 请求、117 个 AUTO ID、63 手工定义；原有 26 请求完整保留；重新生成资产无漂移 |
| 敏感/临时文件 | 候选文件的 JWT/私钥/Token/本地用户路径、证据密码字段、忽略规则及临时数据路径 |
| 从零搭建 | 同机全新 Git 候选副本，不复制 node_modules、缓存、.env 或数据库；空缓存安装并实际运行 |
| Git diff | 原有跟踪文件无删除；业务 src 未在验收阶段新增改动；现有 src 两处差异对应之前的真实缺陷修复 |

完整检查结果见 [audit.json](../evidence/acceptance/2026-10-09/audit.json)。本机验收通过不等于另一台物理电脑或其他操作系统已经实测。

最终检查覆盖 87 个候选文件、18 个 JS 文件语法；敏感模式、未脱敏凭据字段、异常候选路径、失效链接及实现哈希不一致均为 0。git diff --check 通过，跟踪文件删除为 0，独立测试服务进程为 0。

## 2. 发现的问题及修复

| 问题 | 修复 | 受影响内容的验证 |
| --- | --- | --- |
| README 缺少 Git、获取代码、进入目录、开发依赖与版本/网络说明 | 补齐 Git 工作副本、npm ci --include=dev、MySQL 服务端、MYSQL_BIN、网络及权限；明确当前成果未发布 | 无依赖/无缓存副本安装成功，并完成隔离运行 |
| 历史复现/实验室 manifest 的 command 字段被硬编码为普通 test:local | 新运行器根据 --probe / --lab 记录命令；历史证据不覆盖，另附原文件哈希及正确调用 | 新 probe 与 lab 的实际 command 分别正确记录；[更正说明](../evidence/acceptance/2026-10-09/historical-command-errata.json) |
| 完整运行器仅看失败数，未将跳过/pending 纳入完整性判定；停止标志曾仅依赖已发送 kill | 完整套件将 Not Run/pending 判为未完成；等待实际退出；无法确认自己服务停止时标 Blocked，保留 executionStatus | 正常完整回归及实验室退出实测；漏跑/强制停止失败分支为代码审查，未做故障注入 |
| 并发夹具密码可由公开运行信息推导 | 改为密码学随机值，仅内存使用并纳入脱敏；bcrypt 校验使用同一个随机值 | 12 用户准备、DB-004 bcrypt 比较和整个补充套件通过 |
| 业务规则“未知字段一律拒绝”描述过宽 | 说明白名单作用于注册/登录、创建/更新、关闭 PATCH、预约 POST；DELETE 使用 Token 身份，忽略 body/query | 针对 DELETE body 的实际检查通过：B 传 A 的 user_id 仍为 404；A 传 B 的 user_id 仍只取消 A |

原始结果未改成绿色；原建设报告已标为阶段快照，避免其“未执行独立 Newman”等当时状态与本次新增执行混淆。

旧并发数据只存在已停止且被忽略的隔离目录，没有真实/生产账号；没有删除数据或迁移历史库。源码中的公开密码边界样例属于测试输入，不是运行凭据。新运行随机凭据不由邮箱/运行编号导出。

## 3. 实际补充执行及证据

时间均为 2026-10-09，UTC+08:00；JSON 内保留原始 UTC ISO 时间。

| 执行 | 时间 | 实际结果 |
| --- | --- | --- |
| 空缓存 npm ci --include=dev | 21:36:45.864—21:37:00.443（npm 日志时间） | 退出 0，安装 241 个包；Newman 实际从独立副本 node_modules 加载 |
| 测试资产重新生成 | 完整回归前 | Collection/环境/自动化目录 SHA-256 无变化；143 请求、117 个扩展 ID |
| 独立副本首轮完整运行 | 21:38:50.558—21:39:23.202 | 143 请求、418 断言无失败；随后发现并发夹具密码可推导，修复后重新运行 |
| 最终候选完整回归 | 21:40:36.012—21:41:06.969 | 143 请求、418 断言，0 失败、0 pending、0 Not Run；24 项补充检查 Pass；3 项缺陷回归 Pass；13 组 SQL 观察；OpenAPI 字段审查 Pass |
| probe 模式 | 21:41:13.439—21:41:21.382 | 3 项回归 Pass，command 正确记录 --probe |
| 实验室模式 | 21:41:55.347—21:43:27.761 | 实际启动、提供本地环境、Ctrl+C 停止；manifest 为 Not Run，command 正确记录 test:lab |
| 独立 npm run test:api | 见执行索引实际时间 | 139 请求、406 断言，0 失败；AUTO-022..025 四个无签名夹具请求明确 Not Run |
| DELETE 身份文档验证 | 见证据实际时间 | 10 个辅助请求，身份与逻辑取消预期全部匹配 |

实验室按 Ctrl+C 停止时，外层 npm 中断码为 1；不是业务测试失败。其 manifest 的 Not Run 仅表示实验室没有自行执行套件，另一个进程执行的独立 Newman 与针对性验证有单独证据。

证据入口：

- [空缓存安装](../evidence/acceptance/2026-10-09/installation.json)。
- [所有补充执行的命令与统计](../evidence/acceptance/2026-10-09/execution-index.json)。
- [最终候选 manifest / 哈希](../evidence/acceptance/2026-10-09/runs/2026-10-09T13-40-36-006Z-e8832c/manifest.json)。
- [最终 Newman](../evidence/acceptance/2026-10-09/runs/2026-10-09T13-40-36-006Z-e8832c/newman.json)。
- [最终并发/DB](../evidence/acceptance/2026-10-09/runs/2026-10-09T13-40-36-006Z-e8832c/concurrency-db.json)。
- [独立 Newman / 四项 Not Run](../evidence/acceptance/2026-10-09/standalone-newman/newman.json)。
- [DELETE 身份验证](../evidence/acceptance/2026-10-09/delete-identity.json)。

本次没有进行新的人工 Postman GUI 逐条测试，没有把原 63 条手工用例改为 Pass，没有新增或伪造产品缺陷。原三个真实产品/文档问题仍有修复前证据与修复后回归。

## 4. 在其他电脑上运行的判断

**已实际验证：** 本机 Windows x64 / PowerShell、Node 24.12.0、npm 11.6.2、MySQL 8.0.42；新目录名包含空格、无现成依赖、空缓存、独立 Git 副本及全新 MySQL 数据目录。npm ci 锁定依赖可安装；按 README 的运行入口可启动并完成测试。

**未实际验证：** 另一台物理电脑、新装操作系统、Node 20/22 等其他版本、macOS/Linux、其他 MySQL 版本、目标机器的运行库/代理/权限差异。这些均已写入 README/运行说明，不声称跨机器实测成功。

复现前置：

1. 安装 Git、Node.js 和 MySQL Server；只有 Workbench/mysql 客户端不够。
2. 使用包含本次改动的完整 Git 工作副本，进入项目目录。
3. 能够访问锁文件中的 registry.npmmirror.com；npm ci --include=dev 安装 Newman 等依赖。
4. MYSQL_BIN 指向实际 MySQL bin，项目目录可写。
5. 按 README 设置 EVENT_BOOKING_ALLOW_TEST_WRITES=YES 后运行 test:local 或 test:lab。

当前改动未 commit/push，直接克隆 GitHub 不能取得本次候选成果；这属于发布状态，不通过自动提交来绕过。ZIP 没有 Git 元数据，当前隔离运行器不支持直接从 ZIP 运行，已明确标注。

## 5. 安全、临时目录与限制

- 候选的正式证据是选择字段后的脱敏 JSON，不包含数据库 dump、真实个人账号、明文运行密码或 JWT。
- .env、.runtime、node_modules、日志、本地 Postman 环境和原始本地输出均被忽略；没有把副本、MySQL 数据或 npm 缓存纳入提交候选。
- 临时数据保留在 .runtime/，未执行清理、DROP、TRUNCATE 或 SQL DELETE。HTTP DELETE 是逻辑取消。
- 只停止本轮创建的服务，未停止已有 MySQL 服务；最终进程检查结果在 audit.json。
- npm 安装保留了 deprecated 依赖提示；Node fs.F_OK 提示也未隐藏。这次没有执行依赖漏洞审计，不将“敏感文件扫描通过”说成完整安全审计。
- 有限并发、原手工用例未执行及压力/安全测试范围仍沿用原报告限制。

## 6. Git 与修改范围

分支 main，仍为原 5 个提交，HEAD 为 3a2ab14612b50b94cd97d008205413e25c60c2f7。暂存区为空，所有成果仍为未提交状态。未执行 commit、push 或修改原仓库远程配置。

本次验收直接修正：

- README.md、docs/running-tests.md：搭建步骤、已测/未测环境、未发布状态。
- scripts/testing/run-local.js：模式命令、完整性与服务停止判定。
- tests/concurrency-and-db.js：随机测试凭据。
- docs/business-rules.md、docs/api-spec.md：未知字段与 DELETE 身份规则。
- docs/test-plan.md、test-cases/concurrency-and-db.md：区分 SQL 删除与 HTTP 逻辑取消，明确全库检查和独立活动场景的数据范围。
- reports/test-summary-2026-10-09.md、evidence/README.md：历史快照与更正索引。
- 新增本报告和 evidence/acceptance/2026-10-09/ 中的真实验收记录。

package-lock.json、依赖版本及 src 业务代码在本次验收阶段未修改。原建设阶段的 src/db/connection.js、src/routes/event.routes.js 改动对应 BUG-002/BUG-001；其余原始业务文件和原 26 请求均保留。

最终文件数量、敏感扫描、链接检查、哈希一致性、git diff --check 和无删除结论以 audit.json 为准。

验收完成时：23 个既有文件修改、50 个新增未跟踪文件，暂存区为空。等待用户确认后才决定后续提交，不自动 commit 或 push。
