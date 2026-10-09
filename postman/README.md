# Postman / Newman

## 使用

1. 启动专用测试环境。推荐按照 [运行说明](../docs/running-tests.md) 执行 npm run test:lab。
2. 导入 Event-Booking-API.postman_collection.json。
3. 导入本地实验室生成的环境，或 local.postman_environment.json 模板并填写本地值。
4. 依次运行 Main Business Chain、Selected Negative Cases、Extended Authentication Boundaries and Workflows。

当前定义共 143 个请求。执行记录见 [实际报告](../reports/test-summary-2026-10-09.md)；模板不携带执行状态。

## 环境变量

| 变量 | 提供方式 |
| --- | --- |
| baseUrl | 实验室自动生成或填写本地专用 API 地址 |
| organizerEmail / organizerPassword | Organizer A 本地测试凭据 |
| otherOrganizerEmail / otherOrganizerPassword | Organizer B 本地测试凭据，必须与 A 是不同账号 |
| userPassword | 本地测试密码；test:local 自动随机生成 |
| runId、用户名字/邮箱、futureStartTime | 主链第一条动态生成 |
| userAToken、userBToken、organizerToken、otherOrganizerToken | 登录响应自动提取 |
| eventId、extendedEventId、bookingId 等 | 创建/预约响应自动提取 |
| expiredToken、wrongAlgorithmToken、missingSubjectToken、forgedRoleToken | test:local 在内存签名的负向夹具；手工环境默认为空 |
| otherEventId | 保留原手工双活动验证占位，可按需填写 |

正确签名的过期 Token 等 4 条请求在缺少夹具时通过 pm.execution.skipRequest() 跳过，结果必须记为 Not Run。不要把生产 JWT secret 放进 Postman 来补齐它们。test:local 实际生成并执行这些场景。

User A/B 每次用时间戳创建唯一身份。所有活动都由本轮创建；容量边界 100000 只创建活动记录，不会生成十万预约。关闭测试活动后不能重新开放，重新执行应从主链第一条开始生成新数据。

## 断言与证据

检查 HTTP、错误码、字段、状态、预约 ID 复用、个人数据隔离、UTC 时间和人数整数契约。409 EVENT_FULL 或 401 TOKEN_EXPIRED 等负向场景匹配预期时是该断言通过，不是产品 Bug。

环境中的密码和 Token 应只保存在本地值。不要分享运行后的环境导出、控制台授权头或带凭据截图。仓库 Newman 运行器直接生成脱敏报告，不导出原始 Newman summary。

## 维护

scripts/newman/build-collection.js 保留原有前两个文件夹，再生成扩展请求和 automated-cases.md：

~~~powershell
npm run test:collection
~~~

扩展请求请修改构建脚本；前两个原有文件夹可在 Collection 内维护。生成定义不执行接口，不产生测试结果。原手工目录含多组输入，不把一条自动化请求视作整条手工用例所有变体都已验证。
