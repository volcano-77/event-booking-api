# 实际测试证据

最新候选成果的从零安装及补充执行位于 [验收证据索引](acceptance/2026-10-09/execution-index.json)，结论见 [验收报告](../reports/acceptance-2026-10-09.md)。

evidence/runs/ 保存真实执行后自动生成的脱敏 JSON；当前索引和结论在 [测试报告](../reports/test-summary-2026-10-09.md)。

- 2026-10-09T13-10-16-694Z-7e89af：首轮，保留人数类型断言失败、OpenAPI 审查失败。
- 2026-10-09T13-13-20-568Z-7b6dd1：针对性独立复现，三项问题均 Fail。
- 2026-10-09T13-14-52-379Z-381c55：修复后的完整回归。
- 2026-10-09T13-19-35-543Z-cd8f6c：手工实验室启动及 Ctrl+C 停止检查；自动测试状态 Not Run。
- [2026-10-11T01-25-31-505Z-c17380](runs/2026-10-11T01-25-31-505Z-c17380/manifest.json)：新隔离实例的完整回归，143 请求、418 断言、24 项补充检查、3 项缺陷回归和 13 组 SQL 观察；结果 Pass。

以上复现与实验室两轮的 command 字段原先被硬编码为普通 test:local；正确调用见 [历史命令元数据更正](acceptance/2026-10-09/historical-command-errata.json)。更正文件保留原 manifest 的 SHA-256，未覆盖原始证据或结果。新的运行器已按模式记录真实命令。

每轮 manifest 包括真实 UTC 时间、时区、命令、版本、Git HEAD、实际测试源码 SHA-256、环境和服务停止状态。测试在未提交工作树执行，所以单独一个 Git HEAD 不能标识全部被测代码；文件哈希补充这一点。

newman.json 是经过选择字段及脱敏的运行结果，密码/授权头/Token 不保留；concurrency-db.json 是真实并发响应和数据库观察；sql-templates.json 是实际只读结果；regression-probe.json 是缺陷复现/回归。不是原始环境文件，不包含截图、数据库 dump 或真实用户账号。

evidence/newman/、manual/、sql/ 保留为本地补充证据的忽略目录。发布前仍应人工复核脱敏内容。不要用不同运行编号的结果拼接成一次执行，也不要删除首轮失败来只展示绿色报告。
