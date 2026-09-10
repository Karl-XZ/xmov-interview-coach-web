from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import re
import urllib.error
import urllib.request


ROOT = Path(__file__).resolve().parent / "public"
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "7860"))
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
XMOV_APP_ID = os.environ.get("XMOV_APP_ID", "")
XMOV_APP_SECRET = os.environ.get("XMOV_APP_SECRET", "")
XMOV_GATEWAY = os.environ.get(
    "XMOV_GATEWAY",
    "https://nebula-agent.xingyun3d.com/user/v1/ttsa/session",
)
XMOV_AVATAR_LOOK = os.environ.get("XMOV_AVATAR_LOOK", "N_Wuliping_14333_new")


JOB_TEMPLATES = {
    "product_manager": {
        "title": "产品经理实习生",
        "jd": "负责用户调研、需求分析、竞品分析、产品方案设计和数据复盘；要求逻辑清晰、沟通能力强，具备基础数据分析和文档表达能力。",
    },
    "frontend": {
        "title": "前端开发实习生",
        "jd": "负责 Web 前端页面开发、组件实现、接口联调和性能优化；要求熟悉 HTML、CSS、JavaScript，了解前端工程化和用户体验。",
    },
    "java_backend": {
        "title": "Java 后端开发实习生",
        "jd": "参与后端服务开发、接口设计、数据库建模和线上问题排查；要求熟悉 Java、Spring Boot、MySQL，具备基础系统设计能力。",
    },
    "algorithm": {
        "title": "算法工程师实习生",
        "jd": "参与机器学习模型训练、特征分析、实验评估和模型部署；要求掌握 Python、机器学习基础和实验复盘能力。",
    },
    "operations": {
        "title": "新媒体运营实习生",
        "jd": "负责内容策划、账号运营、活动执行和数据复盘；要求网感好、表达能力强，能基于数据优化内容策略。",
    },
}


SAMPLE_RESUME = """张同学，某高校信息管理专业 2026 届本科生。
项目经历：校园二手交易小程序产品负责人，负责用户访谈、需求拆解、原型设计和上线复盘。通过 20 份用户访谈发现商品搜索和信任背书问题，推动新增分类筛选、实名认证标识和收藏功能。上线两周内发布商品数从 180 增长到 430，日活提升约 35%。
实习经历：某教育科技公司产品运营实习生，参与课程详情页转化优化，整理用户反馈 120 条，协助设计 A/B 测试方案，最终报名转化率提升 8%。
技能：Axure、Figma、SQL 基础、Excel 数据分析、用户调研、PRD 写作。"""


def clean_text(value, limit):
    return str(value or "").strip()[:limit]


def clamp_score(value):
    try:
        number = int(round(float(value)))
    except (TypeError, ValueError):
        return 0
    return max(0, min(10, number))


def extract_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text, flags=re.I).strip()
        text = re.sub(r"```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", text, flags=re.S)
        if match:
            return json.loads(match.group(1))
        raise


def deepseek(messages, temperature=0.45, response_format=None):
    api_key = str(DEEPSEEK_API_KEY or "").strip()
    if not api_key:
        raise RuntimeError("智能面试服务暂时不可用")

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
    }
    if response_format:
        payload["response_format"] = response_format

    request = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            result = json.loads(response.read().decode("utf-8", errors="ignore") or "{}")
            answer = (
                result.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            if not answer:
                raise RuntimeError("智能面试服务没有生成结果")
            return answer
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"智能面试服务返回异常：{detail[:180]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError("智能面试服务连接失败，请稍后再试") from exc
    except TimeoutError as exc:
        raise RuntimeError("智能面试服务响应超时，请稍后再试") from exc


def default_plan(job_title, jd):
    focus = [
        "表达清晰度",
        "岗位匹配度",
        "项目经历真实性",
        "专业能力",
        "复盘意识",
        "沟通与抗压",
    ]
    return {
        "position": job_title,
        "interview_type": "标准面试",
        "candidate_profile": "候选人已提供简历，系统将围绕经历细节、岗位能力和表达结构进行追问。",
        "jd_summary": jd[:180],
        "competency_model": focus,
        "questions": [
            {
                "id": 1,
                "question": f"请先用 1 分钟做一个自我介绍，重点说明你为什么适合{job_title}。",
                "dimension": "岗位匹配度",
                "intent": "观察候选人是否能把经历和目标岗位建立联系。",
            },
            {
                "id": 2,
                "question": "请选择简历中最能代表你能力的一个项目，说明背景、你的职责、关键动作和最终结果。",
                "dimension": "项目经历真实性",
                "intent": "考察项目细节、个人贡献和结果表达。",
            },
            {
                "id": 3,
                "question": "如果面试官要求你证明自己具备这个岗位的核心能力，你会用哪段经历证明？",
                "dimension": "专业能力",
                "intent": "考察岗位能力证据是否充分。",
            },
            {
                "id": 4,
                "question": "讲一次你遇到分歧或压力的经历，你是如何沟通并推动事情继续前进的？",
                "dimension": "沟通与抗压",
                "intent": "考察沟通方式和压力处理。",
            },
            {
                "id": 5,
                "question": "复盘你刚才提到的经历，如果重新做一次，你会优先改进什么？",
                "dimension": "复盘意识",
                "intent": "考察反思能力和成长性。",
            },
            {
                "id": 6,
                "question": "你有什么想反问面试官的问题？",
                "dimension": "求职成熟度",
                "intent": "考察候选人对岗位和团队的理解。",
            },
        ],
    }


DIMENSION_LABELS = {
    "product_sense": "产品思维",
    "product_thinking": "产品思维",
    "user_research": "用户研究",
    "requirement_analysis": "需求分析",
    "project_experience": "项目经历",
    "project_ownership": "项目推进",
    "communication": "沟通表达",
    "collaboration": "协同能力",
    "execution": "执行落地",
    "learning_ability": "学习能力",
    "structure": "结构化表达",
    "logic": "逻辑清晰度",
    "quantification": "量化意识",
    "data_analysis": "数据分析",
    "technical_understanding": "技术理解",
    "ai_understanding": "AI 技术理解",
    "business_sense": "业务理解",
    "problem_solving": "问题解决",
    "self_reflection": "复盘意识",
    "motivation": "求职动机",
}


def display_dimension(value):
    text = clean_text(value, 40)
    if not text:
        return "综合能力"
    key = text.strip().lower().replace("-", "_").replace(" ", "_")
    if key in DIMENSION_LABELS:
        return DIMENSION_LABELS[key]
    if "_" in text or text.isascii():
        return "综合能力"
    return text


def normalize_plan(plan, job_title, jd):
    if not isinstance(plan, dict):
        return default_plan(job_title, jd)
    questions = plan.get("questions")
    if not isinstance(questions, list) or not questions:
        questions = default_plan(job_title, jd)["questions"]
    normalized = []
    for index, item in enumerate(questions[:8], start=1):
        if isinstance(item, dict):
            question = clean_text(item.get("question"), 300)
            dimension = display_dimension(item.get("dimension"))
            intent = clean_text(item.get("intent"), 180) or "评估候选人与岗位要求的匹配程度。"
        else:
            question = clean_text(item, 300)
            dimension = "综合能力"
            intent = "评估候选人与岗位要求的匹配程度。"
        if question:
            normalized.append({"id": index, "question": question, "dimension": dimension, "intent": intent})
    plan["questions"] = normalized or default_plan(job_title, jd)["questions"]
    plan["position"] = clean_text(plan.get("position"), 80) or job_title
    plan["interview_type"] = clean_text(plan.get("interview_type"), 40) or "标准面试"
    plan["candidate_profile"] = clean_text(plan.get("candidate_profile"), 260) or "候选人已提供简历。"
    plan["jd_summary"] = clean_text(plan.get("jd_summary"), 260) or jd[:180]
    if not isinstance(plan.get("competency_model"), list):
        plan["competency_model"] = ["岗位匹配度", "表达清晰度", "项目经历真实性", "专业能力"]
    else:
        plan["competency_model"] = [display_dimension(item) for item in plan["competency_model"][:8]]
    plan["opening"] = clean_text(
        plan.get("opening"),
        220,
    ) or f"你好，我是本轮{job_title}模拟面试官。接下来我会根据你的简历和目标岗位进行提问，请尽量结合真实经历作答。我们开始吧。"
    return plan


def build_plan(payload):
    job_key = clean_text(payload.get("jobKey"), 60)
    template = JOB_TEMPLATES.get(job_key, JOB_TEMPLATES["product_manager"])
    job_title = clean_text(payload.get("jobTitle"), 80) or template["title"]
    jd = clean_text(payload.get("jd"), 2500) or template["jd"]
    resume = clean_text(payload.get("resume"), 3500) or SAMPLE_RESUME
    interview_type = clean_text(payload.get("interviewType"), 40) or "一面"
    difficulty = clean_text(payload.get("difficulty"), 40) or "标准"

    messages = [
        {
            "role": "system",
            "content": (
                "你是专业校园招聘面试官和就业辅导专家。请根据候选人简历、目标岗位 JD、面试类型和难度，生成一场结构化模拟面试大纲。"
                "必须只输出 JSON，不要输出 Markdown。问题要贴合简历和 JD，不能泛泛而谈。"
            ),
        },
        {
            "role": "user",
            "content": (
                f"目标岗位：{job_title}\n面试类型：{interview_type}\n难度：{difficulty}\n\n岗位JD：\n{jd}\n\n候选人简历：\n{resume}\n\n"
                "请输出 JSON：position, interview_type, candidate_profile, jd_summary, competency_model, opening, questions。"
                "questions 为 6-8 个对象，每个对象包含 question, dimension, intent。"
            ),
        },
    ]
    try:
        plan = extract_json(deepseek(messages, temperature=0.35, response_format={"type": "json_object"}))
    except Exception:
        plan = default_plan(job_title, jd)
    plan = normalize_plan(plan, job_title, jd)
    plan["resume"] = resume
    plan["jd"] = jd
    plan["difficulty"] = difficulty
    return plan


def build_next(payload):
    plan = payload.get("plan") if isinstance(payload.get("plan"), dict) else {}
    transcript = payload.get("transcript") if isinstance(payload.get("transcript"), list) else []
    current = payload.get("currentQuestion") if isinstance(payload.get("currentQuestion"), dict) else {}
    answer = clean_text(payload.get("answer"), 1800)
    question_index = int(payload.get("questionIndex") or 0)
    followups_used = int(payload.get("followupsUsed") or 0)
    questions = plan.get("questions") if isinstance(plan.get("questions"), list) else []

    if not answer:
        raise ValueError("请先输入你的回答")

    messages = [
        {
            "role": "system",
            "content": (
                "你是严格但友好的校园招聘面试官。根据候选人刚才的回答判断是否追问。"
                "只能基于候选人已经说出的内容追问，不得编造经历。"
                "每个主问题最多追问 2 次。输出 JSON，不要 Markdown。"
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "position": plan.get("position"),
                    "jd_summary": plan.get("jd_summary"),
                    "current_question": current,
                    "answer": answer,
                    "followups_used": followups_used,
                    "recent_transcript": transcript[-8:],
                    "rules": {
                        "followup_when": [
                            "回答过短",
                            "只说结论没有过程",
                            "提到成果但没有量化指标",
                            "个人贡献不清楚",
                            "与岗位要求联系不够",
                            "逻辑跳跃或表述模糊",
                        ],
                        "output_schema": {
                            "need_followup": "boolean",
                            "followup_question": "string",
                            "reason": "string",
                        },
                    },
                },
                ensure_ascii=False,
            ),
        },
    ]

    try:
        decision = extract_json(deepseek(messages, temperature=0.35, response_format={"type": "json_object"}))
    except Exception:
        decision = {"need_followup": False, "followup_question": "", "reason": ""}

    need_followup = bool(decision.get("need_followup")) and followups_used < 2
    followup_question = clean_text(decision.get("followup_question"), 260)
    if need_followup and followup_question:
        return {
            "type": "followup",
            "question": followup_question,
            "reason": clean_text(decision.get("reason"), 180),
            "followupsUsed": followups_used + 1,
        }

    next_index = question_index + 1
    if next_index < len(questions):
        next_question = questions[next_index]
        return {
            "type": "next",
            "questionIndex": next_index,
            "question": next_question,
            "message": next_question.get("question"),
            "followupsUsed": 0,
        }
    return {
        "type": "complete",
        "message": "本轮面试问题已经完成。接下来我会根据你的完整回答生成面试复盘报告。",
    }


def fallback_report(plan, transcript):
    dimensions = [
        {"name": "岗位匹配度", "score": 7, "evidence": "回答中提供了与岗位相关的经历。", "issue": "岗位能力和 JD 要求的对应关系还可以更直接。", "suggestion": "用一句话明确说明经历如何对应岗位要求。"},
        {"name": "专业能力", "score": 7, "evidence": "能描述项目或实习中的具体动作。", "issue": "专业方法和工具使用细节不足。", "suggestion": "补充方法、工具、指标和结果。"},
        {"name": "项目表达", "score": 7, "evidence": "能讲出经历背景和部分结果。", "issue": "STAR 结构不够完整。", "suggestion": "按背景、任务、行动、结果组织答案。"},
        {"name": "逻辑清晰度", "score": 8, "evidence": "回答整体能够被理解。", "issue": "部分回答缺少层次。", "suggestion": "先给结论，再分点展开。"},
        {"name": "量化意识", "score": 6, "evidence": "部分结果有描述。", "issue": "量化指标不足。", "suggestion": "尽量补充人数、比例、周期、转化率等数字。"},
        {"name": "沟通与抗压", "score": 7, "evidence": "能回应追问。", "issue": "面对追问时可以更主动补充证据。", "suggestion": "追问时先承认问题，再补充细节。"},
    ]
    total = round(sum(item["score"] for item in dimensions) / len(dimensions) * 10)
    return {
        "total_score": total,
        "summary": "本轮回答能覆盖主要经历，但量化结果、岗位匹配表达和项目复盘仍有提升空间。",
        "dimensions": dimensions,
        "strengths": ["能够围绕自身经历作答", "整体沟通态度稳定", "具备继续打磨的素材基础"],
        "risks": ["部分答案缺少量化证据", "个人贡献和团队成果区分不够", "与目标岗位 JD 的对应关系不够显性"],
        "question_feedback": [
            {
                "question": item.get("question", ""),
                "feedback": "建议进一步补充背景、行动和结果，突出个人贡献。",
                "better_answer": "我会先说明项目背景，再讲清楚我负责的具体动作，最后用数据说明结果和复盘。",
            }
            for item in transcript
            if item.get("role") in ("interviewer", "assistant")
        ][:6],
        "next_training_plan": ["练习 1 分钟自我介绍", "为每段项目经历补充 2 个量化指标", "准备 3 个和 JD 强相关的证明案例"],
    }


def normalize_report(report, plan, transcript):
    if not isinstance(report, dict):
        report = fallback_report(plan, transcript)
    dimensions = report.get("dimensions")
    if not isinstance(dimensions, list) or not dimensions:
        dimensions = fallback_report(plan, transcript)["dimensions"]
    normalized = []
    for item in dimensions[:8]:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "name": display_dimension(item.get("name")),
                "score": clamp_score(item.get("score")),
                "evidence": clean_text(item.get("evidence"), 260) or "面试记录中有相关回答。",
                "issue": clean_text(item.get("issue"), 260) or "表达还可以更具体。",
                "suggestion": clean_text(item.get("suggestion"), 260) or "建议补充更多事实、指标和个人贡献。",
            }
        )
    report["dimensions"] = normalized
    report["total_score"] = max(0, min(100, int(report.get("total_score") or round(sum(item["score"] for item in normalized) / max(1, len(normalized)) * 10))))
    for key in ["strengths", "risks", "next_training_plan"]:
        value = report.get(key)
        if not isinstance(value, list):
            report[key] = fallback_report(plan, transcript)[key]
        else:
            report[key] = [clean_text(item, 180) for item in value[:6] if clean_text(item, 180)]
    feedback = report.get("question_feedback")
    if not isinstance(feedback, list):
        feedback = fallback_report(plan, transcript)["question_feedback"]
    normalized_feedback = []
    for item in feedback[:8]:
        if not isinstance(item, dict):
            continue
        normalized_feedback.append(
            {
                "question": clean_text(item.get("question"), 260) or "本轮面试问题",
                "answer_review": clean_text(item.get("answer_review") or item.get("feedback"), 360) or "回答能够覆盖部分信息，但还需要补充更具体的行动和结果。",
                "improvement": clean_text(item.get("improvement") or item.get("better_answer"), 420) or "建议按背景、任务、行动、结果组织，并补充岗位相关指标。",
            }
        )
    report["question_feedback"] = normalized_feedback
    report["summary"] = clean_text(report.get("summary"), 420) or fallback_report(plan, transcript)["summary"]
    return report


def build_report(payload):
    plan = payload.get("plan") if isinstance(payload.get("plan"), dict) else {}
    transcript = payload.get("transcript") if isinstance(payload.get("transcript"), list) else []
    messages = [
        {
            "role": "system",
            "content": (
                "你是专业校园招聘面试评估官。请只根据面试记录评分，不得推测用户未说出的经历。"
                "评分要可解释，每个维度必须给证据、问题和建议。不要根据性别、年龄、学校层次、外貌、口音、地域、家庭背景评分。"
                "只输出 JSON，不要 Markdown。"
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "position": plan.get("position"),
                    "jd": plan.get("jd"),
                    "resume": plan.get("resume"),
                    "questions": plan.get("questions"),
                    "transcript": transcript,
                    "output_schema": {
                        "total_score": "0-100 number",
                        "summary": "string",
                        "dimensions": "array of {name, score 0-10, evidence, issue, suggestion}",
                        "strengths": "array string",
                        "risks": "array string",
                        "question_feedback": "array of {question, feedback, better_answer}",
                        "next_training_plan": "array string",
                    },
                },
                ensure_ascii=False,
            ),
        },
    ]
    try:
        report = extract_json(deepseek(messages, temperature=0.3, response_format={"type": "json_object"}))
    except Exception:
        report = fallback_report(plan, transcript)
    return normalize_report(report, plan, transcript)


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        print("[interview-avatar]", fmt % args)

    def read_json(self):
        size = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(size).decode("utf-8") or "{}")

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/healthz":
            self.send_json({"ok": True, "name": "digital-human-interview-assistant"})
            return
        if self.path == "/api/config":
            self.send_json(
                {
                    "xmov": {
                        "appId": XMOV_APP_ID,
                        "appSecret": XMOV_APP_SECRET,
                        "gatewayServer": XMOV_GATEWAY,
                        "avatarLook": XMOV_AVATAR_LOOK,
                    }
                }
            )
            return
        super().do_GET()

    def do_POST(self):
        routes = {
            "/api/interview/plan": build_plan,
            "/api/interview/next": build_next,
            "/api/interview/report": build_report,
        }
        handler = routes.get(self.path)
        if not handler:
            self.send_json({"error": "接口不存在"}, 404)
            return
        try:
            result = handler(self.read_json())
            if self.path == "/api/interview/plan":
                self.send_json({"plan": result})
            elif self.path == "/api/interview/report":
                self.send_json({"report": result})
            else:
                self.send_json(result)
        except ValueError as exc:
            self.send_json({"error": str(exc)}, 400)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 500)


def main():
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"[interview-avatar] listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
