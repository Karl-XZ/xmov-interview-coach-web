# 职面未来：数字人 AI 面试模拟与复盘助手

<div align="center">

**基于真实岗位与个人经历，完成可追问、可复盘的面对面模拟训练**  
*Face-to-Face Digital Human Interview Simulation & Structured Review Coach*

[![ModelScope](https://img.shields.io/badge/ModelScope-在线体验-624AFF?style=flat-square&logo=modelscope)](https://modelscope.cn/studios/Karlzhy/xmov-interview-coach-web)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)](https://www.python.org/)
[![DeepSeek](https://img.shields.io/badge/LLM-DeepSeek--V3-darkgreen?style=flat-square)](https://www.deepseek.com/)
[![XMOV](https://img.shields.io/badge/Avatar-魔珐星云数字人-purple?style=flat-square)](https://www.xmov.ai/)
[![License](https://img.shields.io/badge/License-Apache--2.0-green?style=flat-square)](LICENSE)

[在线体验入口](https://modelscope.cn/studios/Karlzhy/xmov-interview-coach-web) • [核心亮点](#核心亮点) • [技术架构](#系统技术架构) • [操作流程](#六步使用流程与真实界面) • [环境配置](#环境配置与本地运行) • [方案对比](#方案对比与差异化优势)

</div>

---

## 项目概述

**职面未来（JobFuture Interview Coach）** 是一套面向高校毕业生、职场新人及求职者的端到端数字化面试模拟与深度复盘平台。平台采用**“真实材料输入 + 超写实数字人互动 + 动态追问深挖 + 6 维证据化复盘”**的全流程设计，使岗位理解、临场表达和复盘改进形成紧密衔接的高频训练闭环。

使用者只需提供目标岗位 JD 与个人简历，系统即可由大模型自动化解构岗位关键能力要求，生成专属面试方案；随后由 3D 数字人面试官通过 WebRTC 视频流展开面对面问答；面试过程中系统针对回答漏洞进行连续追问；最终输出包含分项评估依据与具体改进行动的结构化复盘报告。

<div align="center">
  <img src="docs/images/flow_prep_to_review.png" alt="从面试准备到复盘训练全流程闭环" width="850"/>
  <p><em>图 1：从材料准备、数字人实测到结构化复盘的完整训练闭环</em></p>
</div>

---

## 解决的核心痛点

在传统的求职准备过程中，求职者常常面临三大困境：
1. **岗位理解碎片化**：岗位 JD 条目繁杂，缺乏结构化拆解，准备重点模糊不清。
2. **经历表达缺乏章法**：自身项目经历丰富，但在即兴提问时难以组织出具备情境（STAR）、行动细节与量化成果的高分应答。
3. **练习缺乏压力与有效反馈**：普通 AI 对话工具缺乏临场面对面压迫感；而传统题库仅给参考答案或宽泛打分，无法指出具体回答中的证据缺失。

职面未来通过沉浸式数字人面试官建立现场感，依托大语言模型深度锚定岗位上下文，使每一次模拟都能定位到具体回答细节并沉淀演练经验。

---

## 核心亮点

- 🎯 **岗位化专属大纲生成**：结合目标岗位、简历经历、JD 技能点及所选难度，系统动态生成涵盖“岗位画像、候选人画像、能力标签与问题路径”的定制题纲。
- 👤 **魔珐星云 3D 数字人直连**：接入魔珐星云超写实数字人形象（默认 `N_Wuliping_14333_new`），通过 WebRTC 协议实现低延迟音视频互动，呈现真实的面试官提问神态与动作。
- 🔄 **自适应动态追问机制**：根据候选人在上一轮回答中的事实完整度与逻辑漏洞，由 AI 自动发起 1~2 轮深度追问（Digging），还原大厂与严苛外企的高压面试环境。
- 🎙️ **多模态全双工交互支持**：支持浏览器端麦克风实时语音回答与文本输入双通道，方便在不同环境下灵活开展演练。
- 📋 **6 维度证据化复盘报告**：从完整问答记录中深度提取证据链，涵盖综合表现、岗位匹配、经历证据、专业能力、表达结构与下一轮改进计划。

<div align="center">
  <img src="docs/images/review_dimensions.png" alt="六项复盘维度体系" width="750"/>
  <p><em>图 2：基于问答证据链的六维结构化复盘体系</em></p>
</div>

---

## 系统技术架构

系统采用轻量化、高内聚的服务架构，实现前端无缝交互、云端超写实渲染与大模型认知中枢的高效分工：

<div align="center">
  <img src="docs/images/arch_overview.png" alt="系统技术架构与能力分工" width="850"/>
  <p><em>图 3：系统技术架构与能力分工模型</em></p>
</div>

### 核心分工体系

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        前端工作台 (Web Client)                          │
│     响应式三栏工作台    │   WebRTC 实时视频流   │    Audio 麦克风录音采集  │
│     输入状态管理中心    │   问答实时演进台账   │    Markdown 复盘报告渲染 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / HTTPS API
┌───────────────────────────────────▼────────────────────────────────────┐
│                       服务端业务网关 (Python Core)                       │
│     轻量多线程 HTTP 网关 │   会话状态机管理     │   Prompt 结构化组装引擎   │
│     内置典型岗位模版库   │   数字人会话中继     │   安全参数与超时控制      │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
┌───────────────────▼──────────────┐ ┌───────────────▼───────────────────┐
│       认知中枢 (DeepSeek AI)      │ │     表现引擎 (魔珐星云 XMOV)     │
│  • 简历与 JD 多模态语义解析       │ │  • 云端超写实数字人实时渲染推流 │
│  • 岗位化定制面试题纲生成         │ │  • TTSA 语音与唇形、动作高保真同步│
│  • 回答漏洞检测与自适应追问决策   │ │  • WebRTC 低延迟双向音视频流传输 │
│  • 6 维度证据化打分与改进建议     │ │  • 多角色面试官外观形象自适应切换│
└──────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 六步使用流程与真实界面

系统提供完整严密的三栏式操作工作台，按照标准求职训练路径展开演练：

### 步骤 1：进入工作台首屏
访问在线地址或本地服务，页面呈现直观的三栏布局：左侧为“参数与材料输入区”，中间为“数字人面试核心舞台”，右侧为“实时大纲与复盘看板”。

<div align="center">
  <img src="docs/images/step1_workbench_overview.jpeg" alt="工作台总览界面" width="800"/>
  <p><em>步骤 1：进入面试准备工作台首屏</em></p>
</div>

### 步骤 2：启动数字人面试官
点击舞台右上角【启动数字人】，系统通过服务端建立魔珐星云云端会话，WebRTC 实时推流就绪，舞台中央展示数字人面试官准备状态。

<div align="center">
  <img src="docs/images/step2_start_digital_human.jpeg" alt="启动数字人面试官" width="800"/>
  <p><em>步骤 2：建立会话并加载数字人面试官</em></p>
</div>

### 步骤 3：配置岗位与输入经历材料
选择目标岗位、面试类型（通用面、专业面、行为面等）与挑战难度，输入简历与职位 JD。左下方提供快捷预置示例（如产品经理、Java 后端、前端开发等），支持一键装载体验。

<div align="center">
  <img src="docs/images/step3_input_resume_jd.jpeg" alt="输入岗位与经历材料" width="800"/>
  <p><em>步骤 3：输入目标岗位要求与个人简历经历</em></p>
</div>

### 步骤 4：生成专属岗位化方案
点击【生成面试方案】，AI 引擎快速解构输入材料，右侧工作栏即时展示提炼出的岗位画像、能力标签与专属题目演进路径。

<div align="center">
  <img src="docs/images/step4_generated_outline.jpeg" alt="生成岗位化面试方案" width="800"/>
  <p><em>步骤 4：查看岗位画像与定制问题路径</em></p>
</div>

### 步骤 5：面对面互动与语音应答
点击【开始面试】，数字人面试官依序进行语音提问。求职者可点击麦克风直接开展语音模拟，系统自动转写并记录应答内容。

<div align="center">
  <img src="docs/images/step5_interview_qa.jpeg" alt="面对面互动与回答提交" width="800"/>
  <p><em>步骤 5：进入连续问答，支持语音与文字作答</em></p>
</div>

### 步骤 6：动态深度追问与结构化复盘
系统实时评估回答证据，针对模糊环节自动发起追问。全场结束后生成综合表现雷达图、逐题优缺点剖析及针对下一轮训练的清晰行动举措。

<div align="center">
  <img src="docs/images/step6_feedback_report.jpeg" alt="查看动态追问与复盘报告" width="800"/>
  <p><em>步骤 6：获取深度追问记录与 6 维结构化复盘报告</em></p>
</div>

---

## 方案对比与差异化优势

<div align="center">
  <img src="docs/images/comparative_advantage.png" alt="创新点与替代方案对比" width="850"/>
  <p><em>图 4：职面未来与常规模拟方案的综合对比</em></p>
</div>

| 对比维度 | 常规 AI 聊天工具 (纯文本) | 传统固定题库 / 录播课 | 真人模拟面试辅导 | **职面未来 (本方案)** |
| :--- | :--- | :--- | :--- | :--- |
| **临场面谈氛围** | 仅纯文本气泡，缺少现场感 | 机械单向输入，无动态互动 | 具备面对面真实感 | **超写实 3D 数字人实时视频流** |
| **岗位匹配度** | 依赖用户自行提示，容易跑题 | 通用死板题目，无法结合履历 | 取决于辅导导师水平 | **简历与真实 JD 深度锚定定制** |
| **追问能力** | 回答后简单收尾，极少深度深挖 | 无自适应追问机制 | 具备追问能力 | **针对回答漏洞自适应精准追问** |
| **复盘反馈质量** | 多为泛化点评或直接给参考答案 | 仅核对标准答案点 | 依赖主观经验口头反馈 | **6 维度证据链剖析与行动指南** |
| **使用成本与频次** | 成本低，可随时进行 | 题目固定，多次使用边际效应递减 | 预约周期长，单次课时费用高昂 | **低边际成本，支持全天候高频演练** |

---

## 环境配置与本地运行

### 1. 前置准备与环境变量

系统通过读取系统环境变量或根目录下 `.env` 文件获取必要密钥：

```bash
# 复制配置文件模板
cp .env.example .env
```

`.env` 配置项说明：

```ini
# DeepSeek 核心大模型配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-chat

# 魔珐星云 (XMOV) 数字人开放平台配置
XMOV_APP_ID=your_xmov_app_id_here
XMOV_APP_SECRET=your_xmov_app_secret_here
XMOV_GATEWAY=https://nebula-agent.xingyun3d.com/user/v1/ttsa/session
XMOV_AVATAR_LOOK=N_Wuliping_14333_new

# 服务运行网络配置
HOST=0.0.0.0
PORT=7860
```

> 💡 **注意**：魔珐星云凭据可前往 [魔珐星云开发者平台](https://xingyun3d.com/) 申请；DeepSeek API Key 可在 [DeepSeek 开放平台](https://platform.deepseek.com/) 获取。

---

### 2. 方式一：本地 Python 原生运行

项目采用纯 Python 标准库构建 HTTP 服务，无需安装复杂的重型框架：

```bash
# 克隆仓库
git clone https://gitee.com/karl-zhou/xmov-interview-coach-web.git
cd xmov-interview-coach-web

# 直接启动（Python 3.10+）
python app.py
```

服务启动后，在现代浏览器中打开：`http://127.0.0.1:7860`。

> ⚠️ **浏览器安全提示**：如需在非本地环境使用麦克风进行语音作答，需在 HTTPS 域名环境下部署运行，以满足 Web 浏览器的麦克风权限安全要求。

---

### 3. 方式二：Docker 容器化部署

项目提供精简 Dockerfile，支持一键打包部署到各类私有云或云原生运行环境：

```bash
# 构建镜像
docker build -t xmov-interview-coach .

# 启动容器
docker run -d \
  --name xmov-coach \
  -p 7860:7860 \
  --env-file .env \
  xmov-interview-coach
```

---

## 典型应用场景

1. **高校就业指导与创新实训营**：作为校级就业指导实训平台，批量辅助在校毕业生针对特定招聘岗位开展针对性自测，输出就业短板分析。
2. **个人高频专项求职备战**：帮助求职者在正式面试前 48 小时内，针对目标公司特定 JD 展开 3~5 轮高强度针对性模考。
3. **招聘平台求职前置服务**：嵌入岗位投递前环节，引导候选人检验技能匹配度并补足表达细节，显著提升面试邀约通过率。

---

## 隐私安全与免责声明

1. **隐私安全规范**：本平台仅将简历与岗位信息用于当前模拟会话的题纲生成与复盘分析，采用阅后即弃的内存计算机制，严禁在公有环境沉淀未经脱敏的个人隐私信息。
2. **系统定位说明**：AI 面试官给出的综合评分、评估结论与改进行动建议旨在辅助求职者进行针对性练习，真实企业面试结果取决于招聘方实际综合考量。
