# 内容文档

文档版本：`v0.1.0`

最后更新：`2026-08-05`

## 1. 内容原则

本项目里的文案要服务日常操作，不写空泛宣传语。

写法原则：

- 直接说明这个模块能做什么。
- 用亚马逊运营人员熟悉的词：广告、Listing、库存、FBA、ACOS、ROI、竞品、关键词。
- 不写“现代化”“高效赋能”“一站式解决方案”等泛化文案。
- 示例数据必须是虚构数据，不能写真实店铺、真实 SKU、真实销售额。

## 2. 当前页面主文案

页面名称：

```text
亚马逊运营工作台
```

顶部说明：

```text
今天的重点和文件资料都放在一个页面里。
```

隐私提示：

```text
静态网页优先，本地数据优先；运营文件默认不离开浏览器。
```

页脚提示：

```text
下一步可以接入真实销售报表、广告 CSV 解析、关键词库和 Cloudflare R2 文件同步。
```

## 3. 当前模块内容

### 3.1 概览

模块标题：

```text
日常巡检流程
```

当前流程：

```text
09:30 库存与断货风险
检查 30 天销量、可售库存、在途和补货 ETA。

11:00 广告预算巡检
找花费突增、ACOS 失控、点击多无转化的活动。

14:30 Listing 质量
检查差评、QA、图片、价格、coupon 和竞品变化。

17:30 复盘记录
把今天调整动作写进备忘，方便明天追踪结果。
```

日常巡检流程支持用户在页面中自定义。编辑字段包括时间、流程名称和检查说明；默认内容可以随时恢复。

提醒文案：

```text
开启通知
提醒时间（可选）
即将到期事项
```

### 3.2 利润测算

输入项：

```text
售价
采购成本
头程/物流
FBA 费用
单件广告
佣金比例 %
```

输出项：

```text
预估利润
利润率
ROI
```

默认示例参数：

```text
salePrice: 29.99
cost: 7.2
shipping: 2.1
fbaFee: 5.3
adSpend: 3.5
referralRate: 15
```

### 3.4 上架前检查

当前检查项：

```text
主图是否清晰
标题是否覆盖核心词
五点是否写出利益点
价格/coupon 是否同步
FBA 库存是否够 30 天
```

后续可扩展：

```text
A+ 页面是否更新
QA 是否有高风险问题
差评关键词是否已处理
变体关系是否正确
类目节点是否正确
```

### 3.5 上传文件区

上传区文案：

```text
上传到私密 GitHub 仓库
上传后会写入私密 GitHub 文件仓库。
上传密钥
```

空状态：

```text
还没有上传记录。适合保存需要换电脑也能找回的运营文件。
```

说明：

- 上传文件区通过 Cloudflare Worker 中转写入 `amazon-ops-workbench-files` 私密仓库。
- 前端只保存上传记录和上传密钥，不保存 GitHub token。
- 点击刷新可以从私密仓库重新获取文件列表。
- 支持预览图片、PDF、文本、JSON、音频和视频；其他类型使用下载。
- 真实文件进入 GitHub 私密仓库历史，删除需要后续增加仓库端删除功能。

### 3.6 备忘录

默认备忘：

```text
今天先看广告异常
先筛 ACOS 高于 35% 的广告组，再看转化率低但点击多的关键词。
标签：广告

新品页检查
主图、五点、A+、QA、coupon、库存、配送时效逐项过一遍。
标签：Listing
```

输入框占位：

```text
标题
标签
记录今天调价、广告、Listing 或库存动作
```

按钮：

```text
新增备忘
```

## 4. 后续内容库建议

### 4.1 运营工具分组

广告：

- Amazon Ads
- Campaign Manager
- Search Term Report
- Bulk Operations

选品：

- Helium 10
- Jungle Scout
- Keepa
- Amazon Best Sellers

Listing：

- Brand Analytics
- Manage Your Experiments
- A+ Content Manager
- Voice of the Customer

库存：

- FBA Inventory
- Restock Inventory
- Shipment Queue

财务：

- Payments
- FBA Revenue Calculator
- Fee Preview Report

### 4.2 常用备忘标签

```text
广告
Listing
库存
选品
竞品
财务
客服
风险
复盘
```

### 4.3 工作日报模板

```text
日期：
今日重点：
广告动作：
Listing 动作：
库存风险：
竞品变化：
明日待办：
```

### 4.4 CSV 解析结果文案

未来接广告报表后，建议输出这些内容：

```text
高花费低转化关键词
ACOS 超阈值广告组
点击增长但订单未增长的词
CTR 低于阈值的广告
预算提前耗尽的活动
建议否定关键词
```
