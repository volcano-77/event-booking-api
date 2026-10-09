# 自动化用例明细

由 scripts/newman/build-collection.js 生成，来源为实际 routes、validators 和业务规则。定义状态不代表执行结果；实际结果按运行编号查 evidence/runs/。
前两组保留原有业务链和负向请求。以下每个 AUTO 编号与 Collection 请求名、证据一一对应。按 Collection 全部顺序执行；Organizer A/B 必须先准备。
每条步骤：1. 完成前置业务链；2. 发送所列请求（完整输入见 Collection）；3. 校验 HTTP、错误码及附加断言。带 expired/wrongAlgorithm/missingSubject/forgedRole 的请求需要隔离运行器生成的签名 JWT，手工缺失时为 Not Run。

| ID | 场景/输入 | 请求 | 预期 | 定义状态 |
| --- | --- | --- | --- | --- |
| AUTO-001 | Login Organizer B | POST /api/auth/login | 200 检查响应/数据 | Not Run |
| AUTO-002 | Create open fixture | POST /api/events | 201 检查响应/数据 | Not Run |
| AUTO-003 | Missing JWT POST /api/events | POST /api/events | 401 TOKEN_MISSING | Not Run |
| AUTO-004 | Wrong role POST /api/events | POST /api/events | 403 FORBIDDEN | Not Run |
| AUTO-005 | Missing JWT PUT /api/events/{{extendedEventId}} | PUT /api/events/{{extendedEventId}} | 401 TOKEN_MISSING | Not Run |
| AUTO-006 | Wrong role PUT /api/events/{{extendedEventId}} | PUT /api/events/{{extendedEventId}} | 403 FORBIDDEN | Not Run |
| AUTO-007 | Missing JWT PATCH /api/events/{{extendedEventId}}/close | PATCH /api/events/{{extendedEventId}}/close | 401 TOKEN_MISSING | Not Run |
| AUTO-008 | Wrong role PATCH /api/events/{{extendedEventId}}/close | PATCH /api/events/{{extendedEventId}}/close | 403 FORBIDDEN | Not Run |
| AUTO-009 | Missing JWT POST /api/events/{{extendedEventId}}/book | POST /api/events/{{extendedEventId}}/book | 401 TOKEN_MISSING | Not Run |
| AUTO-010 | Wrong role POST /api/events/{{extendedEventId}}/book | POST /api/events/{{extendedEventId}}/book | 403 FORBIDDEN | Not Run |
| AUTO-011 | Missing JWT DELETE /api/events/{{extendedEventId}}/book | DELETE /api/events/{{extendedEventId}}/book | 401 TOKEN_MISSING | Not Run |
| AUTO-012 | Wrong role DELETE /api/events/{{extendedEventId}}/book | DELETE /api/events/{{extendedEventId}}/book | 403 FORBIDDEN | Not Run |
| AUTO-013 | Missing JWT GET /api/bookings/me | GET /api/bookings/me | 401 TOKEN_MISSING | Not Run |
| AUTO-014 | Wrong role GET /api/bookings/me | GET /api/bookings/me | 403 FORBIDDEN | Not Run |
| AUTO-015 | Missing JWT GET /api/events/{{extendedEventId}}/bookings | GET /api/events/{{extendedEventId}}/bookings | 401 TOKEN_MISSING | Not Run |
| AUTO-016 | Wrong role GET /api/events/{{extendedEventId}}/bookings | GET /api/events/{{extendedEventId}}/bookings | 403 FORBIDDEN | Not Run |
| AUTO-017 | Non-owner PUT | PUT /api/events/{{extendedEventId}} | 403 NOT_EVENT_OWNER | Not Run |
| AUTO-018 | Non-owner PATCH | PATCH /api/events/{{extendedEventId}}/close | 403 NOT_EVENT_OWNER | Not Run |
| AUTO-019 | Non-owner GET | GET /api/events/{{extendedEventId}}/bookings | 403 NOT_EVENT_OWNER | Not Run |
| AUTO-020 | Malformed Authorization | GET /api/bookings/me | 401 TOKEN_MALFORMED | Not Run |
| AUTO-021 | Damaged signature | GET /api/bookings/me | 401 TOKEN_INVALID | Not Run |
| AUTO-022 | Expired signed JWT | GET /api/bookings/me | 401 TOKEN_EXPIRED | Not Run |
| AUTO-023 | Disallowed algorithm | GET /api/bookings/me | 401 TOKEN_INVALID | Not Run |
| AUTO-024 | Token subject not in database | GET /api/bookings/me | 401 TOKEN_INVALID | Not Run |
| AUTO-025 | Forged role claim cannot grant Organizer | POST /api/events | 403 FORBIDDEN | Not Run |
| AUTO-026 | Cannot self-promote | POST /api/auth/register | 400 UNKNOWN_FIELD | Not Run |
| AUTO-027 | Register missing username | POST /api/auth/register | 400 MISSING_FIELD | Not Run |
| AUTO-028 | Register missing email | POST /api/auth/register | 400 MISSING_FIELD | Not Run |
| AUTO-029 | Register missing password | POST /api/auth/register | 400 MISSING_FIELD | Not Run |
| AUTO-030 | Register username length 2 | POST /api/auth/register | 400 INVALID_FIELD | Not Run |
| AUTO-031 | Register username length 51 | POST /api/auth/register | 400 INVALID_FIELD | Not Run |
| AUTO-032 | Register username number | POST /api/auth/register | 400 INVALID_FIELD | Not Run |
| AUTO-033 | Register username whitespace | POST /api/auth/register | 400 INVALID_FIELD | Not Run |
| AUTO-034 | Register bad email | POST /api/auth/register | 400 INVALID_EMAIL | Not Run |
| AUTO-035 | Register email local 65 | POST /api/auth/register | 400 INVALID_EMAIL | Not Run |
| AUTO-036 | Register email dots | POST /api/auth/register | 400 INVALID_EMAIL | Not Run |
| AUTO-037 | Register email missing domain label | POST /api/auth/register | 400 INVALID_EMAIL | Not Run |
| AUTO-038 | Register password length 7 | POST /api/auth/register | 400 INVALID_FIELD | Not Run |
| AUTO-039 | Register password length 73 | POST /api/auth/register | 400 INVALID_FIELD | Not Run |
| AUTO-040 | Register password 75 UTF8 bytes | POST /api/auth/register | 400 INVALID_FIELD | Not Run |
| AUTO-041 | Register password null | POST /api/auth/register | 400 INVALID_FIELD | Not Run |
| AUTO-042 | Register valid username minimum | POST /api/auth/register | 201 检查响应/数据 | Not Run |
| AUTO-043 | Register valid username maximum | POST /api/auth/register | 201 检查响应/数据 | Not Run |
| AUTO-044 | Register valid password minimum | POST /api/auth/register | 201 检查响应/数据 | Not Run |
| AUTO-045 | Register valid password maximum bytes | POST /api/auth/register | 201 检查响应/数据 | Not Run |
| AUTO-046 | Register valid email normalization | POST /api/auth/register | 201 检查响应/数据 | Not Run |
| AUTO-047 | Duplicate username | POST /api/auth/register | 409 DUPLICATE | Not Run |
| AUTO-048 | Duplicate normalized email | POST /api/auth/register | 409 DUPLICATE | Not Run |
| AUTO-049 | Login wrong password | POST /api/auth/login | 401 INVALID_CREDENTIALS | Not Run |
| AUTO-050 | Login unknown account | POST /api/auth/login | 401 INVALID_CREDENTIALS | Not Run |
| AUTO-051 | Login missing password | POST /api/auth/login | 400 MISSING_FIELD | Not Run |
| AUTO-052 | Login wrong type | POST /api/auth/login | 400 INVALID_FIELD | Not Run |
| AUTO-053 | Login unknown field | POST /api/auth/login | 400 UNKNOWN_FIELD | Not Run |
| AUTO-054 | Create array | POST /api/events | 400 INVALID_BODY | Not Run |
| AUTO-055 | Create unknown owner | POST /api/events | 400 UNKNOWN_FIELD | Not Run |
| AUTO-056 | Create missing capacity | POST /api/events | 400 MISSING_FIELD | Not Run |
| AUTO-057 | Create blank title | POST /api/events | 400 INVALID_FIELD | Not Run |
| AUTO-058 | Create title 121 | POST /api/events | 400 INVALID_FIELD | Not Run |
| AUTO-059 | Create description 2001 | POST /api/events | 400 INVALID_FIELD | Not Run |
| AUTO-060 | Create description null | POST /api/events | 400 INVALID_FIELD | Not Run |
| AUTO-061 | Capacity 0 | POST /api/events | 400 INVALID_CAPACITY | Not Run |
| AUTO-062 | Capacity -1 | POST /api/events | 400 INVALID_CAPACITY | Not Run |
| AUTO-063 | Capacity 1.5 | POST /api/events | 400 INVALID_CAPACITY | Not Run |
| AUTO-064 | Capacity 100001 | POST /api/events | 400 INVALID_CAPACITY | Not Run |
| AUTO-065 | Capacity "1" | POST /api/events | 400 INVALID_CAPACITY | Not Run |
| AUTO-066 | Capacity null | POST /api/events | 400 INVALID_CAPACITY | Not Run |
| AUTO-067 | Capacity true | POST /api/events | 400 INVALID_CAPACITY | Not Run |
| AUTO-068 | Invalid start time 2000-01-01T00:00:00Z | POST /api/events | 400 INVALID_START_TIME | Not Run |
| AUTO-069 | Invalid start time 2099-02-29T00:00:00Z | POST /api/events | 400 INVALID_START_TIME | Not Run |
| AUTO-070 | Invalid start time 2099-01-01T24:00:00Z | POST /api/events | 400 INVALID_START_TIME | Not Run |
| AUTO-071 | Invalid start time 2099-01-01T00:00:00 | POST /api/events | 400 INVALID_START_TIME | Not Run |
| AUTO-072 | Invalid start time 2099-01-01T00:00:00+14:01 | POST /api/events | 400 INVALID_START_TIME | Not Run |
| AUTO-073 | Invalid start time 123 | POST /api/events | 400 INVALID_START_TIME | Not Run |
| AUTO-074 | Create valid minimums | POST /api/events | 201 检查响应/数据 | Not Run |
| AUTO-075 | Create valid maximums | POST /api/events | 201 检查响应/数据 | Not Run |
| AUTO-076 | Create valid timezone offset | POST /api/events | 201 检查响应/数据 | Not Run |
| AUTO-077 | Strict ID 0 | GET /api/events/0 | 400 INVALID_ID | Not Run |
| AUTO-078 | Strict ID -1 | GET /api/events/-1 | 400 INVALID_ID | Not Run |
| AUTO-079 | Strict ID 01 | GET /api/events/01 | 400 INVALID_ID | Not Run |
| AUTO-080 | Strict ID 1.5 | GET /api/events/1.5 | 400 INVALID_ID | Not Run |
| AUTO-081 | Strict ID 12abc | GET /api/events/12abc | 400 INVALID_ID | Not Run |
| AUTO-082 | Strict ID 9007199254740992 | GET /api/events/9007199254740992 | 400 INVALID_ID | Not Run |
| AUTO-083 | Strict ID %201 | GET /api/events/%201 | 400 INVALID_ID | Not Run |
| AUTO-084 | Strict ID 1%20 | GET /api/events/1%20 | 400 INVALID_ID | Not Run |
| AUTO-085 | Missing event GET  | GET /api/events/9007199254740991 | 404 EVENT_NOT_FOUND | Not Run |
| AUTO-086 | Missing event PUT  | PUT /api/events/9007199254740991 | 404 EVENT_NOT_FOUND | Not Run |
| AUTO-087 | Missing event PATCH /close | PATCH /api/events/9007199254740991/close | 404 EVENT_NOT_FOUND | Not Run |
| AUTO-088 | Missing event POST /book | POST /api/events/9007199254740991/book | 404 EVENT_NOT_FOUND | Not Run |
| AUTO-089 | Missing event DELETE /book | DELETE /api/events/9007199254740991/book | 404 EVENT_NOT_FOUND | Not Run |
| AUTO-090 | Missing event GET /bookings | GET /api/events/9007199254740991/bookings | 404 EVENT_NOT_FOUND | Not Run |
| AUTO-091 | Booking rejects user_id | POST /api/events/{{extendedEventId}}/book | 400 UNKNOWN_FIELD | Not Run |
| AUTO-092 | Close rejects supplied status | PATCH /api/events/{{extendedEventId}}/close | 400 UNKNOWN_FIELD | Not Run |
| AUTO-093 | PUT requires complete fields | PUT /api/events/{{extendedEventId}} | 400 MISSING_FIELD | Not Run |
| AUTO-094 | Cancel without booking | DELETE /api/events/{{extendedEventId}}/book | 404 BOOKING_NOT_FOUND | Not Run |
| AUTO-095 | A books extended event | POST /api/events/{{extendedEventId}}/book | 201 检查响应/数据 | Not Run |
| AUTO-096 | B cannot cancel A booking | DELETE /api/events/{{extendedEventId}}/book | 404 BOOKING_NOT_FOUND | Not Run |
| AUTO-097 | B books extended event | POST /api/events/{{extendedEventId}}/book | 201 检查响应/数据 | Not Run |
| AUTO-098 | Capacity below active rejected | PUT /api/events/{{extendedEventId}} | 409 CAPACITY_BELOW_BOOKINGS | Not Run |
| AUTO-099 | Rejected PUT preserves data | GET /api/events/{{extendedEventId}} | 200 检查响应/数据 | Not Run |
| AUTO-100 | Capacity equals active allowed | PUT /api/events/{{extendedEventId}} | 200 检查响应/数据 | Not Run |
| AUTO-101 | A cancels extended event | DELETE /api/events/{{extendedEventId}}/book | 200 检查响应/数据 | Not Run |
| AUTO-102 | Repeated cancellation rejected | DELETE /api/events/{{extendedEventId}}/book | 409 BOOKING_CANCELLED | Not Run |
| AUTO-103 | B history excludes A IDs | GET /api/bookings/me | 200 检查响应/数据 | Not Run |
| AUTO-104 | Closed event cannot be edited | PUT /api/events/{{eventId}} | 409 EVENT_CLOSED | Not Run |
| AUTO-105 | Cancel allowed after CLOSED | DELETE /api/events/{{eventId}}/book | 200 检查响应/数据 | Not Run |
| AUTO-106 | Create rebook-full fixture | POST /api/events | 201 检查响应/数据 | Not Run |
| AUTO-107 | A first books rebook-full fixture | POST /api/events/{{rebookFullEventId}}/book | 201 检查响应/数据 | Not Run |
| AUTO-108 | A releases rebook-full fixture | DELETE /api/events/{{rebookFullEventId}}/book | 200 检查响应/数据 | Not Run |
| AUTO-109 | B takes rebook-full fixture | POST /api/events/{{rebookFullEventId}}/book | 201 检查响应/数据 | Not Run |
| AUTO-110 | Rebooking cannot bypass full capacity | POST /api/events/{{rebookFullEventId}}/book | 409 EVENT_FULL | Not Run |
| AUTO-111 | Rejected rebooking preserves CANCELLED | GET /api/bookings/me | 200 检查响应/数据 | Not Run |
| AUTO-112 | Public list includes OPEN and CLOSED | GET /api/events | 200 检查响应/数据 | Not Run |
| AUTO-113 | Public detail contract count | GET /api/events/{{extendedEventId}} | 200 检查响应/数据 | Not Run |
| AUTO-114 | UTC created_at represents real creation time | GET /api/events/{{extendedEventId}} | 200 检查响应/数据 | Not Run |
| AUTO-115 | Booking timestamps represent real instants | GET /api/bookings/me | 200 检查响应/数据 | Not Run |
| AUTO-116 | Malformed JSON | POST /api/auth/register | 400 INVALID_JSON | Not Run |
| AUTO-117 | Body larger than 32kb | POST /api/auth/register | 413 BODY_TOO_LARGE | Not Run |

边界风险来源：Requirement（实现中的长度、范围和状态规则）；并发场景来源为 Inferred QA Risk，另见 concurrency-and-db.md。这里的数值 100000 是输入上限测试，不代表已执行十万用户负载。
