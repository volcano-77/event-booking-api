# Newman 运行器

- npm run test:local：全新本地 MySQL、应用、143 个请求、并发与 SQL，推荐首次执行。
- npm run test:lab：只启动隔离手工实验室，不自动执行测试。
- npm run test:api：对已启动的本地专用 API 执行 Collection。
- npm run test:collection：生成 Collection 和自动化用例目录，不发送请求。
- run.ps1：兼容 PowerShell 的可选入口，参数仍可指定项目内 Collection / Environment 路径。

完整命令与凭据变量见 [运行说明](../../docs/running-tests.md)。

run.js 使用现有 newman 包的程序化接口。只保存脱敏的请求输入、响应、断言统计和未执行项，不保存整个原始 summary，不使用命令行 --env-var 传递密码，不生成含运行环境凭据的原始 JSON/JUnit。

独立 test:api 需提供 A/B 两个 Organizer 及 EVENT_BOOKING_ALLOW_TEST_WRITES=YES，且只允许本机 URL。它会创建数据并关闭本轮活动，必须连接专门测试库；不会清空数据。输出 evidence/newman/ 已被忽略。

test:local 的经过脱敏的复现、完整回归证据保存在 evidence/runs/，可供人工审查后提交。没有自动 git add、commit、push。

运行器只根据真实 execution 和 assertion 统计；Not Run/Blocked 不当作 Pass。最终判定仍需结合范围、前置条件和缺陷复现，参见 reports/。
