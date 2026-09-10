const DEFAULT_GATEWAY = "https://nebula-agent.xingyun3d.com/user/v1/ttsa/session";
const DEFAULT_AVATAR_LOOK = "N_Wuliping_14333_new";
let runtimeConfigPromise = null;
const AVATAR_CONFIG = {
  look_name: DEFAULT_AVATAR_LOOK,
  enable_asr: true,
  asr_enabled: true,
  init_events: [
    {
      type: "SetCharacterCanvasAnchor",
      x_location: 0,
      y_location: 0,
      width: 1,
      height: 1
    }
  ]
};

async function loadRuntimeConfig() {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = fetch("/api/config", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("无法读取数字人配置");
      return response.json();
    });
  }
  return runtimeConfigPromise;
}

const JOB_DATA = {
  product_manager: {
    title: "AI 产品经理",
    jd:
      "负责 AI 产品需求分析、用户研究、功能规划和项目推进；需要理解大模型能力边界，能把业务目标拆解为可落地的产品方案，并与算法、设计、研发协同完成上线和迭代。"
  },
  frontend: {
    title: "前端开发工程师",
    jd:
      "负责 Web 应用前端开发和性能优化，熟悉 JavaScript、TypeScript、React/Vue、工程化和组件化，有良好的交互还原、接口联调和问题定位能力。"
  },
  java_backend: {
    title: "Java 后端工程师",
    jd:
      "负责服务端系统设计、接口开发、数据库建模和稳定性保障，熟悉 Java、Spring Boot、MySQL、Redis、消息队列和常见分布式系统问题。"
  },
  algorithm: {
    title: "算法工程师",
    jd:
      "负责机器学习或大模型相关算法研发、数据处理、模型评估和线上效果优化，熟悉 Python、深度学习框架、实验设计和模型部署流程。"
  },
  operations: {
    title: "用户运营",
    jd:
      "负责用户增长、活动策划、社群运营、数据分析和转化提升，能围绕目标人群设计运营策略，持续复盘指标并推动跨团队执行。"
  }
};

const SAMPLE_RESUME = `姓名：林晨
目标岗位：AI 产品经理
教育背景：信息管理与信息系统，本科
项目经历：
1. 设计过一款校园 AI 简历优化工具，负责用户访谈、需求拆解、原型设计和上线后的数据复盘。
2. 参与企业知识库问答项目，梳理文档问答流程，推动研发接入大模型接口并优化回答命中率。
实习经历：在互联网公司产品部门实习 4 个月，跟进需求评审、埋点方案、竞品分析和用户反馈整理。
技能：Axure、Figma、SQL、Python 基础、Prompt 设计、数据看板分析。
优势：沟通主动、学习快，能把复杂问题整理成清晰文档。
不足：大型商业化项目经验较少。`;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  startAvatarBtn: $("#startAvatarBtn"),
  connectionState: $("#statusPill"),
  avatarMount: $("#avatarMount"),
  avatarFallback: $("#avatarFallback"),
  caption: $("#caption"),
  jobSelect: $("#jobSelect"),
  interviewType: $("#interviewType"),
  difficulty: $("#difficulty"),
  resumeInput: $("#resumeInput"),
  jdInput: $("#jdInput"),
  sampleBtn: $("#sampleBtn"),
  planBtn: $("#planBtn"),
  briefView: $("#briefView"),
  briefEmpty: $("#briefEmpty"),
  briefContent: $("#briefContent"),
  interviewView: $("#interviewView"),
  questionMeta: $("#questionMeta"),
  currentQuestion: $("#currentQuestion"),
  questionIntent: $("#questionIntent"),
  answerForm: $("#answerForm"),
  answerInput: $("#answerInput"),
  voiceAnswerBtn: $("#voiceAnswerBtn"),
  voiceStatus: $("#voiceStatus"),
  submitAnswerBtn: $("#submitAnswerBtn"),
  finishBtn: $("#finishBtn"),
  resetInterviewBtn: $("#resetInterviewBtn"),
  transcriptLog: $("#transcriptLog"),
  reportView: $("#reportView"),
  reportEmpty: $("#reportEmpty"),
  reportContent: $("#reportContent")
};

const state = {
  avatar: null,
  connected: false,
  connecting: false,
  avatarVisible: false,
  plan: null,
  transcript: [],
  questionIndex: 0,
  currentQuestion: null,
  followupsUsed: 0,
  report: null,
  busy: false,
  started: false,
  recognition: null,
  recognizing: false,
  finalVoiceText: "",
  avatarResizeObserver: null,
  avatarResizePending: false
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function setCaption(text) {
  els.caption.hidden = false;
  els.caption.textContent = text || "数字面试官已就绪。";
}

function setConnection(text, variant = "idle") {
  els.connectionState.textContent = text;
  els.connectionState.dataset.state = variant;
  els.connectionState.classList.toggle("online", variant === "ready");
  els.connectionState.classList.toggle("error", variant === "error");
  if (els.startAvatarBtn) {
    els.startAvatarBtn.disabled = state.connected || state.connecting;
    els.startAvatarBtn.textContent = state.connected ? "数字人已启动" : state.connecting ? "启动中" : "启动数字人";
  }
}

function setSpeaking(isSpeaking) {
  els.avatarFallback.classList.toggle("speaking", Boolean(isSpeaking));
}

function setFallbackVisible(isVisible) {
  els.avatarFallback.classList.toggle("hidden", !isVisible);
  els.avatarFallback.hidden = false;
}

function markAvatarVisible() {
  state.avatarVisible = true;
  normalizeAvatarStage();
  setFallbackVisible(false);
}

function setBusy(isBusy, text) {
  state.busy = isBusy;
  els.planBtn.disabled = isBusy;
  els.submitAnswerBtn.disabled = isBusy || !state.started || !state.currentQuestion;
  updateVoiceControls();
  els.finishBtn.disabled = isBusy || !state.started || state.transcript.filter((item) => item.role === "user").length === 0;
  if (text) setCaption(text);
}

function setVoiceStatus(text) {
  els.voiceStatus.textContent = text;
}

function getSdkConstructor() {
  return window.XmovAvatar || window.XMovAvatar || window.NebulaAvatar || window.AvatarSDK || null;
}

function fitAvatarCanvas() {
  normalizeAvatarStage();
}

function normalizeAvatarStage() {
  const mount = els.avatarMount;
  mount.style.position = "absolute";
  mount.style.inset = "0";
  mount.style.width = "100%";
  mount.style.height = "100%";
  mount.style.minHeight = "100%";
  mount.style.overflow = "hidden";
  mount.querySelectorAll("canvas, video, div").forEach((node) => {
    node.style.position = "absolute";
    if (node instanceof HTMLCanvasElement || node instanceof HTMLVideoElement) {
      node.style.left = "50%";
      node.style.right = "auto";
      node.style.top = "auto";
      node.style.bottom = "0";
      node.style.width = "auto";
      node.style.height = "100%";
      node.style.minWidth = "0";
      node.style.minHeight = "0";
      node.style.maxWidth = "100%";
      node.style.display = "block";
      node.style.objectFit = "contain";
      node.style.objectPosition = "center bottom";
      node.style.transformOrigin = "center bottom";
      node.style.transform = "translateX(-50%)";
    } else {
      node.style.inset = "0";
      node.style.width = "100%";
      node.style.height = "100%";
      node.style.minWidth = "100%";
      node.style.minHeight = "100%";
    }
  });
}

function watchAvatarStageSize() {
  normalizeAvatarStage();
  window.setTimeout(normalizeAvatarStage, 300);
  window.setTimeout(normalizeAvatarStage, 1000);
  window.setTimeout(normalizeAvatarStage, 2500);
  if (state.avatarResizeObserver) {
    state.avatarResizeObserver.disconnect();
  }
  state.avatarResizeObserver = new MutationObserver(() => {
    if (state.avatarResizePending) return;
    state.avatarResizePending = true;
    window.requestAnimationFrame(() => {
      state.avatarResizePending = false;
      normalizeAvatarStage();
    });
  });
  state.avatarResizeObserver.observe(els.avatarMount, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"]
  });
}

async function connectAvatar() {
  if (state.connected || state.connecting) return;

  if (!window.isSecureContext || typeof window.VideoDecoder === "undefined") {
    setConnection("请使用 HTTPS", "error");
    setFallbackVisible(true);
    setCaption("当前访问地址无法显示数字人画面，请使用 HTTPS 演示地址打开。");
    return;
  }

  const AvatarCtor = getSdkConstructor();
  if (!AvatarCtor) {
    setConnection("待启动", "idle");
    setCaption("数字面试官正在准备中，请稍后再试。");
    return;
  }

  state.connecting = true;
  state.avatarVisible = false;
  setConnection("接入中", "loading");
  setCaption("正在接入数字面试官。");

  try {
    setFallbackVisible(true);
    const runtimeConfig = await loadRuntimeConfig();
    const xmov = runtimeConfig.xmov || {};
    if (!xmov.appId || !xmov.appSecret) {
      throw new Error("数字人服务尚未配置");
    }
    state.avatar = new AvatarCtor({
      containerId: "#avatarMount",
      appId: xmov.appId,
      appSecret: xmov.appSecret,
      gatewayServer: xmov.gatewayServer || DEFAULT_GATEWAY,
      headers: { Authorization: "888jn" },
      enableDebugger: false,
      config: {
        ...AVATAR_CONFIG,
        look_name: xmov.avatarLook || DEFAULT_AVATAR_LOOK
      },
      onWidgetEvent(data) {
        if (data && data.type === "subtitle_on") {
          setCaption(data.text || "");
        }
      },
      onVoiceStateChange(status) {
        setSpeaking(status === "start");
      },
      onStatusChange(status) {
        if (status === 5 || status === "visible") {
          markAvatarVisible();
          setConnection("已接入", "ready");
        }
      },
      onRenderChange(status) {
        if (status === "rendering") {
          markAvatarVisible();
          setConnection("已接入", "ready");
        }
      },
      onMessage(message) {
        if (message && message.code && message.code !== 0) {
          console.error("[XMOV]", message);
        }
      }
    });

    if (typeof state.avatar.init === "function") {
      await state.avatar.init({
        initModel: "normal",
        onDownloadProgress(progress) {
          if (!state.connected) {
            setConnection(`加载 ${progress}%`, "loading");
          }
        }
      });
    }
    if (typeof state.avatar.start === "function") {
      await state.avatar.start();
    } else if (typeof state.avatar.connect === "function") {
      await state.avatar.connect();
    }

    state.connected = true;
    setConnection(state.avatarVisible ? "已接入" : "加载中", state.avatarVisible ? "ready" : "loading");
    setCaption(state.avatarVisible ? "数字面试官已接入。" : "数字面试官正在加载画面。");
    watchAvatarStageSize();
    if (state.avatarVisible) {
      setFallbackVisible(false);
    }
    window.setTimeout(() => {
      speak("你好，我是你的 AI 面试官。准备好后，可以先生成面试大纲。");
    }, 600);
  } catch (error) {
    console.error(error);
    state.avatar = null;
    state.connected = false;
    setFallbackVisible(true);
    setConnection("待启动", "idle");
    setCaption("数字面试官暂时未接入，仍可继续完成文字面试。");
  } finally {
    state.connecting = false;
  }
}

async function speak(text) {
  const content = String(text || "").trim();
  if (!content) return;
  setCaption(content);
  window.__avatarSpeaking = true;
  window.__lastAvatarSpeech = { text: content, startedAt: Date.now(), endedAt: 0 };

  if (!state.connected || !state.avatar) {
    window.__avatarSpeaking = false;
    window.__lastAvatarSpeech.endedAt = Date.now();
    return;
  }

  try {
    if (typeof state.avatar.speak === "function") {
      await state.avatar.speak(content, true, true);
    } else if (typeof state.avatar.sendText === "function") {
      await state.avatar.sendText(content);
    } else if (typeof state.avatar.tts === "function") {
      await state.avatar.tts(content);
    }
  } catch (error) {
    console.error(error);
    setCaption(content);
  } finally {
    window.__avatarSpeaking = false;
    window.__lastAvatarSpeech.endedAt = Date.now();
  }
}

function speechConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function updateVoiceControls() {
  const supported = Boolean(speechConstructor());
  const available = supported && state.started && state.currentQuestion && !state.busy;
  els.voiceAnswerBtn.disabled = !available;
  els.voiceAnswerBtn.classList.toggle("listening", state.recognizing);
  els.voiceAnswerBtn.textContent = state.recognizing ? "停止录音" : "语音回答";

  if (!supported) {
    setVoiceStatus("当前浏览器不支持语音输入，可继续文字回答");
  } else if (!state.started) {
    setVoiceStatus("开始面试后可使用语音回答");
  } else if (state.busy) {
    setVoiceStatus("面试官正在处理回答");
  } else if (state.recognizing) {
    setVoiceStatus("正在听你回答，停顿后会自动提交");
  } else {
    setVoiceStatus("点击后直接说出你的回答");
  }
}

function stopVoiceRecognition() {
  if (state.recognition && state.recognizing) {
    state.recognizing = false;
    state.recognition.stop();
  }
  updateVoiceControls();
}

function startVoiceRecognition() {
  if (state.busy || !state.started || !state.currentQuestion) return;

  const Recognition = speechConstructor();
  if (!Recognition) {
    setVoiceStatus("当前浏览器不支持语音输入，可继续文字回答");
    return;
  }

  if (state.recognizing) {
    stopVoiceRecognition();
    return;
  }

  const recognition = new Recognition();
  state.recognition = recognition;
  state.finalVoiceText = "";

  recognition.lang = "zh-CN";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    state.recognizing = true;
    els.answerInput.value = "";
    updateVoiceControls();
  };

  recognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const text = event.results[index][0]?.transcript || "";
      if (event.results[index].isFinal) {
        state.finalVoiceText += text;
      } else {
        interim += text;
      }
    }
    els.answerInput.value = `${state.finalVoiceText}${interim}`.trim();
  };

  recognition.onerror = (event) => {
    state.recognizing = false;
    const message = event.error === "not-allowed" ? "请允许浏览器使用麦克风" : "语音识别中断，请再试一次";
    setVoiceStatus(message);
    updateVoiceControls();
  };

  recognition.onend = () => {
    const answer = (state.finalVoiceText || els.answerInput.value || "").trim();
    state.recognizing = false;
    updateVoiceControls();
    if (answer && state.started && state.currentQuestion && !state.busy) {
      els.answerInput.value = answer;
      window.setTimeout(() => submitAnswer(), 250);
    }
  };

  try {
    recognition.start();
  } catch {
    state.recognizing = false;
    setVoiceStatus("语音识别未能启动，请再试一次");
    updateVoiceControls();
  }
}

async function apiPost(path, payload) {
  const endpoint = path.replace(/^\/+/, "");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "请求失败，请稍后重试。");
  }
  return data;
}

function selectedJob() {
  const key = els.jobSelect.value;
  return { key, ...JOB_DATA[key] };
}

function syncJobDescription(force = false) {
  const job = selectedJob();
  if (force || !els.jdInput.value.trim()) {
    els.jdInput.value = job.jd;
  }
}

function fillSample() {
  els.jobSelect.value = "product_manager";
  els.interviewType.value = "综合面试";
  els.difficulty.value = "中等";
  els.resumeInput.value = SAMPLE_RESUME;
  els.jdInput.value = JOB_DATA.product_manager.jd;
  setCaption("示例简历和岗位要求已填入。");
}

function showView(name) {
  $$(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === name);
  });
  [els.briefView, els.interviewView, els.reportView].forEach((view) => {
    view.classList.toggle("active", view.dataset.view === name);
  });
}

function renderBrief() {
  if (!state.plan) {
    els.briefEmpty.hidden = false;
    els.briefContent.hidden = true;
    els.briefContent.innerHTML = "";
    return;
  }

  const plan = state.plan;
  els.briefEmpty.hidden = true;
  els.briefContent.hidden = false;
  els.briefContent.innerHTML = `
    <div class="brief-grid">
      <section class="summary-card">
        <span class="eyebrow">岗位</span>
        <h3>${escapeHtml(plan.job_title || plan.position)}</h3>
        <p>${escapeHtml(plan.jd_summary)}</p>
      </section>
      <section class="summary-card">
        <span class="eyebrow">候选人画像</span>
        <p>${escapeHtml(plan.candidate_profile)}</p>
      </section>
    </div>
    <section class="competency-block">
      <span class="eyebrow">考察能力</span>
      <div class="tag-row">
        ${(plan.competency_model || []).map((item) => `<span>${escapeHtml(displayDimension(item))}</span>`).join("")}
      </div>
    </section>
    <section class="question-list">
      <span class="eyebrow">面试题纲</span>
      ${(plan.questions || [])
        .map(
          (item, index) => `
          <article class="question-item">
            <strong>${String(index + 1).padStart(2, "0")}</strong>
            <div>
              <h4>${escapeHtml(item.question)}</h4>
              <p>${escapeHtml(item.intent)}</p>
            </div>
          </article>`
        )
        .join("")}
    </section>
    <button type="button" class="primary-button wide-button" id="startInterviewBtn">开始面试</button>
  `;

  $("#startInterviewBtn")?.addEventListener("click", startInterview);
}

function displayDimension(value) {
  const text = String(value || "").trim();
  const labels = {
    product_sense: "产品思维",
    product_thinking: "产品思维",
    user_research: "用户研究",
    requirement_analysis: "需求分析",
    project_experience: "项目经历",
    project_ownership: "项目推进",
    communication: "沟通表达",
    collaboration: "协同能力",
    execution: "执行落地",
    learning_ability: "学习能力",
    structure: "结构化表达",
    logic: "逻辑清晰度",
    quantification: "量化意识",
    data_analysis: "数据分析",
    technical_understanding: "技术理解",
    ai_understanding: "AI 技术理解",
    business_sense: "业务理解",
    problem_solving: "问题解决",
    self_reflection: "复盘意识",
    motivation: "求职动机"
  };
  const key = text.toLowerCase().replace(/[-\s]+/g, "_");
  if (labels[key]) return labels[key];
  if (!text || text.includes("_") || /^[A-Za-z\s-]+$/.test(text)) return "综合能力";
  return text;
}

function renderQuestion() {
  if (!state.currentQuestion) {
    els.questionMeta.textContent = "未开始";
    els.currentQuestion.textContent = "请先生成面试方案。";
    els.questionIntent.textContent = "";
    els.answerInput.disabled = true;
    els.submitAnswerBtn.disabled = true;
    els.finishBtn.disabled = true;
    updateVoiceControls();
    return;
  }

  const total = state.plan?.questions?.length || 0;
  const dimension = displayDimension(state.currentQuestion.dimension);
  const meta = state.currentQuestion.is_followup
    ? `追问 · ${dimension}`
    : `第 ${state.questionIndex + 1} / ${total} 题 · ${dimension}`;

  els.questionMeta.textContent = meta;
  els.currentQuestion.textContent = state.currentQuestion.question;
  els.questionIntent.textContent = state.currentQuestion.intent || "";
  els.answerInput.disabled = !state.started || state.busy;
  els.submitAnswerBtn.disabled = !state.started || state.busy;
  els.finishBtn.disabled = !state.started || state.busy || state.transcript.filter((item) => item.role === "user").length === 0;
  updateVoiceControls();
}

function addTranscript(role, text, meta = "") {
  state.transcript.push({
    role,
    text: String(text || "").trim(),
    meta,
    time: formatTime()
  });
  renderTranscript();
}

function renderTranscript() {
  if (!state.transcript.length) {
    els.transcriptLog.innerHTML = `<p class="empty">面试开始后，这里会记录问题和回答。</p>`;
    return;
  }

  els.transcriptLog.innerHTML = state.transcript
    .map(
      (item) => `
      <article class="message ${item.role}">
        <div>
          <strong>${item.role === "user" ? "我" : "面试官"}</strong>
          <span>${escapeHtml(item.time)}</span>
        </div>
        ${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ""}
        <p>${escapeHtml(item.text)}</p>
      </article>`
    )
    .join("");
  els.transcriptLog.scrollTop = els.transcriptLog.scrollHeight;
}

function renderReport() {
  if (!state.report) {
    els.reportEmpty.hidden = false;
    els.reportContent.hidden = true;
    els.reportContent.innerHTML = "";
    return;
  }

  const report = state.report;
  els.reportEmpty.hidden = true;
  els.reportContent.hidden = false;
  els.reportContent.innerHTML = `
    <section class="score-panel score-card">
      <div>
        <span class="eyebrow">综合评分</span>
        <strong>${escapeHtml(report.total_score)}</strong>
      </div>
      <p>${escapeHtml(report.summary)}</p>
    </section>
    <section>
      <span class="eyebrow">分项表现</span>
      <div class="dimension-grid">
        ${(report.dimensions || [])
          .map(
            (item) => `
            <article class="score-card">
              <div><strong>${escapeHtml(displayDimension(item.name))}</strong><span>${escapeHtml(item.score)}</span></div>
              <p>${escapeHtml(item.comment)}</p>
            </article>`
          )
          .join("")}
      </div>
    </section>
    <section class="two-col">
      <div>
        <span class="eyebrow">优势</span>
        <ul>${(report.strengths || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div>
        <span class="eyebrow">待提升</span>
        <ul>${(report.risks || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    </section>
    <section class="feedback-list">
      <span class="eyebrow">逐题建议</span>
      ${(report.question_feedback || [])
        .map(
          (item) => `
          <article class="feedback-card">
            <h4>${escapeHtml(item.question)}</h4>
            <p><strong>回答评价：</strong>${escapeHtml(item.answer_review)}</p>
            <p><strong>改进建议：</strong>${escapeHtml(item.improvement)}</p>
          </article>`
        )
        .join("")}
    </section>
    <section>
      <span class="eyebrow">下一步训练</span>
      <ol>${(report.next_training_plan || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
    </section>
  `;
}

async function generatePlan() {
  stopVoiceRecognition();
  const job = selectedJob();
  const resume = els.resumeInput.value.trim();
  const jd = els.jdInput.value.trim() || job.jd;

  if (!resume) {
    setCaption("请先填写简历，或点击填入示例。");
    return;
  }

  setBusy(true, "正在生成面试方案。");
  try {
    const data = await apiPost("/api/interview/plan", {
      jobKey: job.key,
      jobTitle: job.title,
      jd,
      resume,
      interviewType: els.interviewType.value,
      difficulty: els.difficulty.value
    });

    state.plan = data.plan;
    state.transcript = [];
    state.questionIndex = 0;
    state.currentQuestion = state.plan.questions?.[0] || null;
    state.followupsUsed = 0;
    state.report = null;
    state.started = false;

    renderBrief();
    renderQuestion();
    renderTranscript();
    renderReport();
    showView("brief");
    speak("面试方案已生成。你可以先查看题纲，准备好后开始面试。");
  } catch (error) {
    console.error(error);
    setCaption(error.message);
  } finally {
    setBusy(false);
    renderQuestion();
  }
}

function startInterview() {
  if (!state.plan || !state.currentQuestion) return;
  stopVoiceRecognition();
  state.started = true;
  state.transcript = [];
  renderTranscript();

  addTranscript("assistant", state.plan.opening || "面试现在开始。", "开场");
  addTranscript("assistant", state.currentQuestion.question, state.currentQuestion.dimension || "面试问题");
  renderQuestion();
  showView("interview");
  speak(`${state.plan.opening || "面试现在开始。"} ${state.currentQuestion.question}`);
  els.answerInput.focus();
}

async function submitAnswer(event) {
  event?.preventDefault?.();
  stopVoiceRecognition();
  if (state.busy || !state.started || !state.currentQuestion) return;

  const answer = els.answerInput.value.trim();
  if (!answer) {
    setCaption("请先输入你的回答。");
    return;
  }

  addTranscript("user", answer);
  els.answerInput.value = "";
  setBusy(true, "面试官正在分析你的回答。");

  try {
    const data = await apiPost("/api/interview/next", {
      plan: state.plan,
      transcript: state.transcript,
      currentQuestion: state.currentQuestion,
      answer,
      questionIndex: state.questionIndex,
      followupsUsed: state.followupsUsed
    });

    if (data.type === "followup") {
      state.followupsUsed = data.followupsUsed || state.followupsUsed + 1;
      state.currentQuestion = {
        ...state.currentQuestion,
        question: data.question,
        intent: data.intent || "根据上一轮回答继续追问。",
        is_followup: true
      };
      addTranscript("assistant", data.question, "追问");
      speak(data.question);
    } else if (data.type === "next") {
      state.questionIndex = data.questionIndex;
      state.followupsUsed = 0;
      state.currentQuestion = {
        ...data.question,
        is_followup: false
      };
      addTranscript("assistant", state.currentQuestion.question, state.currentQuestion.dimension || "面试问题");
      speak(state.currentQuestion.question);
    } else {
      state.currentQuestion = null;
      addTranscript("assistant", data.message || "本轮面试问题已完成，我将为你生成复盘报告。", "结束");
      renderQuestion();
      await generateReport();
      return;
    }
  } catch (error) {
    console.error(error);
    setCaption(error.message);
  } finally {
    setBusy(false);
    renderQuestion();
  }
}

async function generateReport() {
  if (!state.plan || !state.transcript.some((item) => item.role === "user")) {
    setCaption("完成至少一轮回答后，可以生成复盘报告。");
    return;
  }

  setBusy(true, "正在生成面试复盘报告。");
  try {
    const data = await apiPost("/api/interview/report", {
      plan: state.plan,
      transcript: state.transcript
    });
    state.report = data.report;
    renderReport();
    showView("report");
    speak("复盘报告已生成。你可以查看综合评分、分项建议和下一步训练计划。");
  } catch (error) {
    console.error(error);
    setCaption(error.message);
  } finally {
    setBusy(false);
    renderQuestion();
  }
}

function resetInterview() {
  stopVoiceRecognition();
  state.plan = null;
  state.transcript = [];
  state.questionIndex = 0;
  state.currentQuestion = null;
  state.followupsUsed = 0;
  state.report = null;
  state.started = false;
  renderBrief();
  renderQuestion();
  renderTranscript();
  renderReport();
  showView("brief");
  setCaption("已重置面试流程。");
}

function bindEvents() {
  els.startAvatarBtn.addEventListener("click", connectAvatar);
  els.sampleBtn.addEventListener("click", fillSample);
  els.planBtn.addEventListener("click", generatePlan);
  els.answerForm.addEventListener("submit", submitAnswer);
  els.voiceAnswerBtn.addEventListener("click", startVoiceRecognition);
  els.finishBtn.addEventListener("click", generateReport);
  els.resetInterviewBtn.addEventListener("click", resetInterview);
  els.jobSelect.addEventListener("change", () => syncJobDescription(true));
  $$(".tab").forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));
  window.addEventListener("resize", fitAvatarCanvas);
  window.addEventListener("beforeunload", () => {
    if (state.avatarResizeObserver) {
      state.avatarResizeObserver.disconnect();
    }
    if (state.avatar && typeof state.avatar.destroy === "function") {
      state.avatar.destroy();
    }
  });
}

function init() {
  syncJobDescription(true);
  renderBrief();
  renderQuestion();
  renderTranscript();
  renderReport();
  bindEvents();
  updateVoiceControls();
  setConnection("待启动", "idle");
  setCaption("点击启动数字人，或先填写简历生成文字模拟面试。");
}

init();
