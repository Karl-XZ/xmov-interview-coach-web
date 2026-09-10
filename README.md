# 职面未来：数字人 AI 面试模拟助手

这是一个本地运行的数字人求职面试模拟项目。用户进入页面后只需填写简历和目标岗位，即可完成一场面对面模拟面试，并在结束后获得评分、逐题反馈和训练建议。

## 核心功能

- 点击启动数字面试官，真实接入形象使用 `N_Wuliping_14333_new`
- 支持输入简历、岗位要求、面试类型和难度
- 支持一键填入示例简历和岗位 JD
- 支持语音回答，用户可通过麦克风完成面对面模拟面谈
- 基于内置 DeepSeek API 生成专属面试题纲
- 面试开始后才展示问题，逐轮回答后由大模型判断追问或进入下一题
- 结束后生成综合评分、分项表现、优势、短板、逐题建议和训练计划

## 环境变量

运行前配置以下环境变量：

```text
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-chat
XMOV_APP_ID=你的魔珐星云 App ID
XMOV_APP_SECRET=你的魔珐星云 App Secret
XMOV_AVATAR_LOOK=N_Wuliping_14333_new
```

## 本地运行

```bash
python app.py
```

服务默认运行在 `http://127.0.0.1:7860`。
