const STORAGE_KEY = "testope.web.progress.v1";
const INFO_ACK_KEY = "testope.web.info.acknowledged.v1";
const BATTERY_FILES = [
  "test_Auxiliar_Administrativo.json",
  "test_Celador.json",
  "test_Comun_Categoria_A_B_C1.json",
  "test_Comun_Categoria_C2_C3_D_E.json",
  "test_Oficial_Mantenimiento_Mecanico.json",
  "test_Oficial_Mantenimiento_Calefactor_Fontanero.json",
  "test_Operario_Servicios.json",
  "test_Tecnico_Superior_Admin_Gestion.json"
];
const LETTERS = ["a", "b", "c", "d"];

export function calculateResults(questions, answers) {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  let ungraded = 0;

  questions.forEach((question, index) => {
    const answer = answers[index];
    if (!LETTERS.includes(String(question.correctAnswer).toLowerCase())) {
      ungraded += 1;
    } else if (!answer) {
      unanswered += 1;
    } else if (question.correctAnswer.toLowerCase() === answer.toLowerCase()) {
      correct += 1;
    } else {
      incorrect += 1;
    }
  });

  return { correct, incorrect, unanswered, ungraded, total: questions.length };
}

export function shuffle(items, random = Math.random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function validateBattery(data, fileName) {
  if (!data || typeof data.title !== "string" || !Array.isArray(data.test) || data.test.length === 0) {
    throw new Error(`${fileName}: formato de batería no válido.`);
  }
  for (const [index, question] of data.test.entries()) {
    if (
      typeof question.question !== "string" ||
      !["optionA", "optionB", "optionC", "optionD"].every(key => typeof question[key] === "string") ||
      ![...LETTERS, "-"].includes(String(question.correctAnswer).toLowerCase())
    ) {
      throw new Error(`${fileName}: la pregunta ${index + 1} está incompleta o no tiene una respuesta válida.`);
    }
  }
  return data;
}

function readProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { results: [], failed: [] };
    const progress = JSON.parse(stored);
    return {
      results: Array.isArray(progress.results) ? progress.results : [],
      failed: Array.isArray(progress.failed) ? progress.failed : [],
      answerOverrides: progress.answerOverrides && typeof progress.answerOverrides === "object"
        ? progress.answerOverrides
        : {}
    };
  } catch {
    return { results: [], failed: [], warning: "No se pudieron leer los datos guardados en este navegador." };
  }
}

const progress = readProgress();
progress.answerOverrides ||= {};
const state = {
  screen: "home",
  batteries: [],
  batteryErrors: [],
  query: "",
  notice: progress.warning || "",
  quiz: null,
  lastResult: null,
  study: null,
  answerTemplate: null
};
const app = typeof document === "undefined" ? null : document.querySelector("#app");

function persistProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      results: progress.results,
      failed: progress.failed,
      answerOverrides: progress.answerOverrides
    }));
    state.notice = "";
    state.noticeType = "";
  } catch (error) {
    state.notice = `No se pudieron guardar los resultados en este navegador: ${error.message}`;
    state.noticeType = "error";
  }
}

function button(label, action, style = "secondary", attributes = "") {
  return `<button class="button ${style}" data-action="${action}" ${attributes}>${label}</button>`;
}

function pageShell(content, actions = "") {
  return `
    <div class="shell">
      <header class="topbar">
        <button class="brand icon-button" data-action="home" aria-label="Ir al inicio">
          <img src="./icon.svg" alt="">
          <span>TestOPE<small>Preparación OPE Osakidetza</small></span>
        </button>
        <div class="top-actions">
          ${actions}
        </div>
      </header>
      <main>${state.notice ? `<div class="notice ${state.noticeType || ""}" role="status">${escapeHtml(state.notice)}</div>` : ""}${content}</main>
      <footer class="fine-print">
        Tus resultados, fallos y cambios se guardan solo en este navegador.
        <button class="quiet-button info-link" data-action="show-info">Privacidad y cookies</button>
      </footer>
    </div>`;
}

function renderHome() {
  const batteries = state.batteries.filter(battery =>
    battery.title.toLocaleLowerCase("es").includes(state.query.toLocaleLowerCase("es"))
  );
  const failedCount = progress.failed.length;
  const resultsCount = progress.results.length;
  const cards = batteries.map(battery => `
    <article class="battery-card">
      <div class="card-top">
        <h3>${escapeHtml(battery.title)}</h3>
        <span class="count-pill">${battery.test.length} preguntas</span>
      </div>
      <p>Practica la batería completa, haz un simulacro aleatorio o estudia las preguntas con su plantilla de respuestas.</p>
      <div class="card-actions">
        ${button("Hacer test", "start-test", "primary", `data-battery="${escapeHtml(battery.id)}"`)}
        ${button("Simulacro · 100", "start-simulation", "secondary", `data-battery="${escapeHtml(battery.id)}"`)}
        ${button("Estudiar", "start-study", "soft", `data-battery="${escapeHtml(battery.id)}"`)}
        ${button("Plantilla", "start-answer-template", "secondary", `data-battery="${escapeHtml(battery.id)}"`)}
      </div>
    </article>`).join("");

  const errors = state.batteryErrors.length
    ? `<div class="notice error">No se pudieron cargar estas baterías: ${state.batteryErrors.map(escapeHtml).join(" · ")}</div>`
    : "";
  const empty = state.batteries.length === 0
    ? `<div class="empty">No se han podido cargar baterías. Comprueba los archivos y vuelve a cargar la página.</div>`
    : cards || `<div class="empty">No hay baterías que coincidan con la búsqueda.</div>`;

  const actions = `
    <button class="quiet-button" data-action="statistics">Mis resultados${resultsCount ? ` · ${resultsCount}` : ""}</button>
    ${failedCount ? `<button class="quiet-button" data-action="review-failed">Repasar fallos · ${failedCount}</button>` : ""}`;

  app.innerHTML = pageShell(`
    <section class="hero">
      <div>
        <p class="eyebrow">Entrena a tu manera</p>
        <h1>Un paso más cerca de tu plaza.</h1>
        <p>Practica las baterías OPE, prepara simulacros y revisa tus errores desde el móvil o el ordenador.</p>
        ${button("Simulacro mezclado", "start-mixed", "soft")}
      </div>
      <div class="hero-art" aria-hidden="true"><span>✓</span></div>
    </section>
    <section>
      <div class="section-heading">
        <div><h2>Tus baterías</h2><p>${state.batteries.length} baterías disponibles</p></div>
        <input id="battery-search" class="search" type="search" placeholder="Buscar batería…" value="${escapeHtml(state.query)}" aria-label="Buscar batería">
      </div>
      ${errors}
      <div class="battery-grid">${empty}</div>
    </section>`, actions);
}

function questionOptions(question, selectedAnswer, mode) {
  return LETTERS.map((letter, index) => {
    const option = question[`option${letter.toUpperCase()}`];
    const selected = selectedAnswer === letter;
    let status = selected ? "selected" : "";
    if (mode === "individual" && selectedAnswer && LETTERS.includes(String(question.correctAnswer).toLowerCase())) {
      if (letter === question.correctAnswer.toLowerCase()) status += " correct";
      else if (selected) status += " wrong";
    }
    return `<button class="option ${status}" data-action="answer" data-answer="${letter}" ${mode === "exam" ? "" : ""}>
      <span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span>
    </button>`;
  }).join("");
}

function renderQuiz() {
  const quiz = state.quiz;
  const question = quiz.questions[quiz.index];
  const selectedAnswer = quiz.answers[quiz.index] || "";
  const isIndividual = quiz.mode === "individual";
  const hasAnswerKey = LETTERS.includes(String(question.correctAnswer).toLowerCase());
  const correct = hasAnswerKey && selectedAnswer && selectedAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
  const elapsed = Math.max(0, Math.floor((Date.now() - quiz.startedAt) / 1000));
  const remaining = quiz.isSimulation ? Math.max(0, 90 * 60 - elapsed) : elapsed;
  const questionButtons = quiz.questions.map((_, index) => {
    const classes = [
      "number-button",
      index === quiz.index ? "current" : "",
      quiz.answers[index] ? "answered" : "",
      quiz.flagged.has(index) ? "flagged" : ""
    ].filter(Boolean).join(" ");
    return `<button class="${classes}" data-action="jump" data-index="${index}" aria-label="Ir a la pregunta ${index + 1}">${index + 1}</button>`;
  }).join("");
  const feedback = isIndividual && selectedAnswer
    ? hasAnswerKey
      ? `<div class="feedback ${correct ? "good" : "bad"}">${correct ? "¡Correcta!" : `Incorrecta. La respuesta correcta es la ${question.correctAnswer.toUpperCase()}.`}</div>`
      : `<div class="feedback">Esta pregunta aún no tiene respuesta oficial. Puedes completar la plantilla de respuestas.</div>`
    : "";
  const previousDisabled = quiz.index === 0 ? "disabled" : "";
  const nextLabel = quiz.index === quiz.questions.length - 1 ? "Finalizar" : "Siguiente";

  app.innerHTML = pageShell(`
    <div class="page-title">
      <h1>${escapeHtml(quiz.title)}</h1>
      <p>${quiz.isSimulation ? "Simulacro con tiempo límite de 90 minutos." : isIndividual ? "Corrección al responder." : "Corrección al finalizar."}</p>
    </div>
    <div class="quiz-layout">
      <section class="quiz-card">
        <div class="quiz-meta">
          <span>Pregunta ${quiz.index + 1} de ${quiz.questions.length}</span>
          <span class="timer" id="quiz-timer">${quiz.isSimulation ? "Restante" : "Tiempo"} · ${formatTime(quiz.isSimulation ? remaining : elapsed)}</span>
        </div>
        <div class="progress-track"><div class="progress-value" style="width:${((quiz.index + 1) / quiz.questions.length) * 100}%"></div></div>
        <h2 class="question-text">${escapeHtml(question.question)}</h2>
        <div class="options">${questionOptions(question, selectedAnswer, quiz.mode)}</div>
        ${feedback}
        <div class="question-actions">
          <div class="left">
            <button class="button secondary" data-action="previous" ${previousDisabled}>Anterior</button>
            <button class="button ${quiz.flagged.has(quiz.index) ? "soft" : "secondary"}" data-action="flag">${quiz.flagged.has(quiz.index) ? "★ Marcada" : "☆ Marcar"}</button>
          </div>
          <div class="right">
            ${button(nextLabel, "next", "primary")}
          </div>
        </div>
      </section>
      <aside class="question-nav">
        <h3>Preguntas</h3>
        <div class="number-grid">${questionButtons}</div>
        <div class="nav-legend">
          <span class="legend-item"><i class="legend-swatch done"></i>Respondida</span>
          <span class="legend-item"><i class="legend-swatch marked"></i>Marcada</span>
        </div>
      </aside>
    </div>`, button("Salir", "exit-quiz"));
}

function renderResult() {
  const result = state.lastResult;
  const evaluableQuestions = result.total - result.ungraded;
  const percentage = evaluableQuestions ? Math.round((result.correct / evaluableQuestions) * 100) : null;
  const review = result.detail.map((item, index) => {
    const userAnswer = item.answer ? `Opción ${item.answer.toUpperCase()}: ${item.question[`option${item.answer.toUpperCase()}`]}` : "Sin responder";
    const answer = String(item.question.correctAnswer).toUpperCase();
    const hasAnswerKey = LETTERS.includes(answer.toLowerCase());
    return `<article class="review-item">
      <h3>${index + 1}. ${escapeHtml(item.question.question)}</h3>
      <p class="${hasAnswerKey && item.answer === answer.toLowerCase() ? "correct-answer" : hasAnswerKey ? "wrong-answer" : ""}">Tu respuesta: ${escapeHtml(userAnswer)}</p>
      ${hasAnswerKey
        ? item.answer !== answer.toLowerCase() ? `<p class="correct-answer">Correcta: ${answer}. ${escapeHtml(item.question[`option${answer}`])}</p>` : ""
        : `<p>Aún no hay una clave de respuesta para esta pregunta.</p>`}
    </article>`;
  }).join("");

  app.innerHTML = pageShell(`
    <section class="result-hero">
      <p class="eyebrow">Resultado del test</p>
      <h1>${percentage === null ? "Sin clave disponible" : `${percentage}% de aciertos`}</h1>
      <p>${escapeHtml(result.title)} · ${new Date(result.date).toLocaleString("es-ES")}</p>
    </section>
    <div class="score-grid">
      <div class="score-tile"><strong>${result.correct}</strong><span>Correctas</span></div>
      <div class="score-tile"><strong>${result.incorrect}</strong><span>Incorrectas</span></div>
      <div class="score-tile"><strong>${result.unanswered}</strong><span>Sin responder</span></div>
      <div class="score-tile"><strong>${result.ungraded}</strong><span>Sin clave</span></div>
      <div class="score-tile"><strong>${formatTime(result.timeSeconds)}</strong><span>Tiempo</span></div>
    </div>
    <div class="card-actions">
      ${button("Volver a baterías", "home", "primary")}
      ${button("Ver estadísticas", "statistics")}
      ${button("Revisar respuestas", "show-review")}
    </div>
    <section id="answer-review" hidden>
      <div class="section-heading"><div><h2>Revisión de respuestas</h2><p>Comprueba las preguntas falladas y las que dejaste en blanco.</p></div></div>
      <div class="review-list">${review}</div>
    </section>`);
}

function renderStatistics() {
  const results = [...progress.results].sort((a, b) => b.date - a.date);
  const totalCorrect = results.reduce((sum, result) => sum + result.correct, 0);
  const totalEvaluable = results.reduce((sum, result) => sum + result.total - (result.ungraded || 0), 0);
  const percentage = totalEvaluable ? Math.round((totalCorrect / totalEvaluable) * 100) : 0;
  const list = results.map(result => `
    <article class="stats-row">
      <div><strong>${escapeHtml(result.title)}</strong><span>${new Date(result.date).toLocaleString("es-ES")} · ${result.correct}/${result.total - (result.ungraded || 0)} evaluables</span></div>
      <strong>${result.total - (result.ungraded || 0) ? `${Math.round(result.correct / (result.total - (result.ungraded || 0)) * 100)}%` : "—"}</strong>
    </article>`).join("");

  app.innerHTML = pageShell(`
    <div class="page-title"><h1>Tu progreso</h1><p>Historial guardado en este navegador.</p></div>
    <div class="score-grid">
      <div class="score-tile"><strong>${results.length}</strong><span>Tests realizados</span></div>
      <div class="score-tile"><strong>${percentage}%</strong><span>Acierto global</span></div>
      <div class="score-tile"><strong>${progress.failed.length}</strong><span>Preguntas por repasar</span></div>
      <div class="score-tile"><strong>${totalEvaluable}</strong><span>Preguntas evaluables</span></div>
    </div>
    <div class="section-heading"><div><h2>Tests recientes</h2></div>${results.length ? button("Borrar historial", "clear-history", "danger") : ""}</div>
    <div class="stats-list">${list || `<div class="empty">Aún no has realizado ningún test.</div>`}</div>`,
  button("Volver", "home"));
}

function renderAnswerTemplate() {
  const template = state.answerTemplate;
  const questions = template.battery.test;
  const question = questions[template.index];
  const knownAnswers = questions.filter(item =>
    LETTERS.includes(String(item.correctAnswer).toLowerCase())
  ).length;
  const answer = String(question.correctAnswer).toLowerCase();
  const hasOverride = Object.hasOwn(progress.answerOverrides, `${template.battery.id}:${template.index}`);
  const questionButtons = questions.map((item, index) => {
    const key = String(item.correctAnswer).toLowerCase();
    const known = LETTERS.includes(key);
    return `<button class="number-button ${index === template.index ? "current" : ""} ${known ? "answered" : ""}" data-action="answer-template-jump" data-index="${index}" aria-label="Pregunta ${index + 1}, respuesta ${known ? key.toUpperCase() : "sin marcar"}">${index + 1}${known ? ` ${key.toUpperCase()}` : ""}</button>`;
  }).join("");

  app.innerHTML = pageShell(`
    <div class="page-title"><h1>Plantilla de respuestas</h1><p>${escapeHtml(template.battery.title)} · ${knownAnswers} de ${questions.length} respuestas marcadas</p></div>
    <div class="quiz-layout">
      <section class="quiz-card">
        <div class="quiz-meta"><span>Pregunta ${template.index + 1} de ${questions.length}</span><span>${LETTERS.includes(answer) ? `Correcta: ${answer.toUpperCase()}` : "Sin respuesta marcada"}</span></div>
        <div class="progress-track"><div class="progress-value" style="width:${(knownAnswers / questions.length) * 100}%"></div></div>
        <h2 class="question-text">${escapeHtml(question.question)}</h2>
        <div class="options">${LETTERS.map((letter, index) => `
          <button class="option ${answer === letter ? "correct" : ""}" data-action="set-answer-key" data-answer="${letter}">
            <span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(question[`option${letter.toUpperCase()}`])}</span>
          </button>`).join("")}</div>
        <div class="question-actions">
          <div class="left"><button class="button secondary" data-action="answer-template-previous" ${template.index === 0 ? "disabled" : ""}>Anterior</button></div>
          <div class="right">
            ${button("Quitar clave", "clear-answer-key", "secondary", answer === "-" ? "disabled" : "")}
            ${hasOverride ? button("Restaurar original", "restore-answer-key") : ""}
            ${button(template.index === questions.length - 1 ? "Terminar" : "Siguiente", "answer-template-next", "primary")}
          </div>
        </div>
      </section>
      <aside class="question-nav">
        <h3>Respuestas</h3>
        <div class="number-grid">${questionButtons}</div>
        <div class="nav-legend"><span class="legend-item"><i class="legend-swatch done"></i>Clave guardada</span><span class="legend-item"><i class="legend-swatch"></i>Sin clave</span></div>
      </aside>
    </div>`,
  button("Volver", "home"));
}

function renderStudy() {
  const study = state.study;
  const question = study.questions[study.index];
  const answer = String(question.correctAnswer).toLowerCase();
  const revealed = study.revealed;
  const hasAnswerKey = LETTERS.includes(answer);
  app.innerHTML = pageShell(`
    <div class="page-title"><h1>Modo estudio</h1><p>${escapeHtml(study.title)} · Pregunta ${study.index + 1} de ${study.questions.length}</p></div>
    <section class="quiz-card study-card">
      <div class="progress-track"><div class="progress-value" style="width:${((study.index + 1) / study.questions.length) * 100}%"></div></div>
      <h2 class="question-text">${escapeHtml(question.question)}</h2>
      <div class="options">${LETTERS.map((letter, index) => `
        <div class="option ${revealed && hasAnswerKey && letter === answer ? "correct" : ""}">
          <span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(question[`option${letter.toUpperCase()}`])}</span>
        </div>`).join("")}</div>
      ${revealed ? hasAnswerKey
        ? `<div class="study-answer"><strong>Respuesta correcta: ${answer.toUpperCase()}</strong>${escapeHtml(question[`option${answer.toUpperCase()}`])}</div>`
        : `<div class="notice">Esta pregunta todavía no tiene una respuesta correcta configurada. Puedes completarla en la plantilla.</div>`
        : ""}
      <div class="question-actions">
        <div class="left"><button class="button secondary" data-action="study-previous" ${study.index === 0 ? "disabled" : ""}>Anterior</button></div>
        <div class="right">
          ${revealed ? "" : button("Ver respuesta", "reveal-answer", "soft")}
          ${button(study.index === study.questions.length - 1 ? "Terminar" : "Siguiente", "study-next", "primary")}
        </div>
      </div>
    </section>`,
  button("Salir", "home"));
}

function render() {
  if (state.screen === "quiz") renderQuiz();
  else if (state.screen === "result") renderResult();
  else if (state.screen === "statistics") renderStatistics();
  else if (state.screen === "answer-template") renderAnswerTemplate();
  else if (state.screen === "study") renderStudy();
  else renderHome();
}

function startQuiz(title, questions, { mode = "individual", isSimulation = false } = {}) {
  if (!questions.length) {
    state.notice = "No hay preguntas disponibles para iniciar este test.";
    state.noticeType = "error";
    state.screen = "home";
    render();
    return;
  }
  state.notice = "";
  state.quiz = {
    title,
    questions,
    mode,
    isSimulation,
    index: 0,
    answers: {},
    flagged: new Set(),
    startedAt: Date.now(),
    saved: false
  };
  state.screen = "quiz";
  render();
}

function startBatteryQuiz(battery, simulation) {
  const questions = battery.test.map((question, index) => ({
    ...question,
    correctAnswer: progress.answerOverrides[`${battery.id}:${index}`] || question.correctAnswer,
    batteryId: battery.id,
    batteryTitle: battery.title,
    sourceIndex: index
  }));
  startQuiz(
    simulation ? `Simulacro: ${battery.title}` : battery.title,
    simulation ? shuffle(questions).slice(0, 100) : questions,
    { mode: simulation ? "exam" : "individual", isSimulation: simulation }
  );
}

function finishQuiz() {
  const quiz = state.quiz;
  if (!quiz || quiz.saved) return;
  const outcome = calculateResults(quiz.questions, quiz.answers);
  const detail = quiz.questions.map((question, index) => ({ question, answer: quiz.answers[index] || "" }));
  const result = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: quiz.title,
    ...outcome,
    date: Date.now(),
    timeSeconds: Math.floor((Date.now() - quiz.startedAt) / 1000),
    detail
  };
  quiz.saved = true;
  state.lastResult = result;
  progress.results.unshift({
    id: result.id,
    title: result.title,
    correct: result.correct,
    incorrect: result.incorrect,
    unanswered: result.unanswered,
    ungraded: result.ungraded,
    total: result.total,
    date: result.date,
    timeSeconds: result.timeSeconds
  });
  progress.results = progress.results.slice(0, 100);

  const failures = new Map(progress.failed.map(item => [`${item.batteryId}:${item.sourceIndex}`, item]));
  detail.forEach(({ question, answer }) => {
    if (!question.batteryId || !Number.isInteger(question.sourceIndex)) return;
    if (!LETTERS.includes(String(question.correctAnswer).toLowerCase())) return;
    const key = `${question.batteryId}:${question.sourceIndex}`;
    if (answer && answer.toLowerCase() === question.correctAnswer.toLowerCase()) {
      failures.delete(key);
    } else if (answer) {
      failures.delete(key);
      failures.set(key, {
        ...question,
        batteryId: question.batteryId,
        batteryTitle: question.batteryTitle,
        sourceIndex: question.sourceIndex
      });
    }
  });
  progress.failed = [...failures.values()].slice(-500);
  persistProgress();
  state.screen = "result";
  render();
}

function startStudy(battery) {
  state.study = {
    title: battery.title,
    questions: battery.test.map((question, index) => ({
      ...question,
      correctAnswer: progress.answerOverrides[`${battery.id}:${index}`] || question.correctAnswer,
      sourceIndex: index
    })),
    index: 0,
    revealed: false
  };
  state.screen = "study";
  render();
}

function startAnswerTemplate(battery) {
  const questions = battery.test.map((question, index) => ({
    ...question,
    originalAnswer: question.correctAnswer,
    correctAnswer: progress.answerOverrides[`${battery.id}:${index}`] || question.correctAnswer
  }));
  const firstUnanswered = questions.findIndex(question =>
    !LETTERS.includes(String(question.correctAnswer).toLowerCase())
  );
  state.answerTemplate = {
    battery: { ...battery, test: questions },
    index: firstUnanswered < 0 ? 0 : firstUnanswered
  };
  state.screen = "answer-template";
  render();
}

function handleAction(action, target) {
  const quiz = state.quiz;
  switch (action) {
    case "home":
      if (state.screen === "quiz" && !window.confirm("¿Salir del test? Perderás las respuestas de este intento.")) return;
      state.screen = "home";
      state.quiz = null;
      state.notice = "";
      render();
      break;
    case "statistics":
      state.screen = "statistics";
      render();
      break;
    case "start-test": {
      const battery = state.batteries.find(item => item.id === target.dataset.battery);
      if (battery) startBatteryQuiz(battery, false);
      break;
    }
    case "start-simulation": {
      const battery = state.batteries.find(item => item.id === target.dataset.battery);
      if (battery) startBatteryQuiz(battery, true);
      break;
    }
    case "start-mixed": {
      const questions = state.batteries.flatMap(battery => battery.test.map((question, index) => ({
        ...question, batteryId: battery.id, batteryTitle: battery.title, sourceIndex: index
      })));
      startQuiz("Simulacro mezclado", shuffle(questions).slice(0, 100), { mode: "exam", isSimulation: true });
      break;
    }
    case "start-study": {
      const battery = state.batteries.find(item => item.id === target.dataset.battery);
      if (battery) startStudy(battery);
      break;
    }
    case "start-answer-template": {
      const battery = state.batteries.find(item => item.id === target.dataset.battery);
      if (battery) startAnswerTemplate(battery);
      break;
    }
    case "answer":
      if (!quiz) break;
      quiz.answers[quiz.index] = target.dataset.answer;
      render();
      break;
    case "previous":
      if (quiz && quiz.index > 0) { quiz.index -= 1; render(); }
      break;
    case "next":
      if (!quiz) break;
      if (quiz.index < quiz.questions.length - 1) { quiz.index += 1; render(); }
      else if (window.confirm("¿Finalizar el test y ver el resultado?")) finishQuiz();
      break;
    case "jump":
      if (quiz) { quiz.index = Number(target.dataset.index); render(); }
      break;
    case "flag":
      if (!quiz) break;
      if (quiz.flagged.has(quiz.index)) quiz.flagged.delete(quiz.index);
      else quiz.flagged.add(quiz.index);
      render();
      break;
    case "exit-quiz":
      handleAction("home", target);
      break;
    case "review-failed":
      if (progress.failed.length) startQuiz("Repaso de fallos", progress.failed.map(question => ({
        ...question,
        correctAnswer: progress.answerOverrides[`${question.batteryId}:${question.sourceIndex}`] || question.correctAnswer
      })), { mode: "exam" });
      break;
    case "show-review": {
      const review = document.querySelector("#answer-review");
      if (review) {
        review.hidden = false;
        review.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      break;
    }
    case "show-info":
      document.querySelector("#site-info")?.showModal();
      break;
    case "clear-history":
      if (!window.confirm("¿Borrar todo el historial y las preguntas guardadas para repasar en este navegador?")) return;
      progress.results = [];
      progress.failed = [];
      persistProgress();
      render();
      break;
    case "study-previous":
      if (state.study && state.study.index > 0) {
        state.study.index -= 1;
        state.study.revealed = false;
        render();
      }
      break;
    case "study-next":
      if (!state.study) break;
      if (state.study.index < state.study.questions.length - 1) {
        state.study.index += 1;
        state.study.revealed = false;
        render();
      } else {
        state.screen = "home";
        render();
      }
      break;
    case "reveal-answer":
      if (state.study) { state.study.revealed = true; render(); }
      break;
    case "answer-template-jump":
      if (state.answerTemplate) {
        state.answerTemplate.index = Number(target.dataset.index);
        render();
      }
      break;
    case "answer-template-previous":
      if (state.answerTemplate && state.answerTemplate.index > 0) {
        state.answerTemplate.index -= 1;
        render();
      }
      break;
    case "answer-template-next":
      if (!state.answerTemplate) break;
      if (state.answerTemplate.index < state.answerTemplate.battery.test.length - 1) {
        state.answerTemplate.index += 1;
        render();
      } else {
        state.screen = "home";
        state.notice = "La plantilla de respuestas está guardada en este navegador.";
        state.noticeType = "success";
        render();
      }
      break;
    case "set-answer-key":
    case "clear-answer-key":
    case "restore-answer-key": {
      const template = state.answerTemplate;
      if (!template) break;
      const { battery, index } = template;
      const question = battery.test[index];
      const key = `${battery.id}:${index}`;
      if (action === "set-answer-key") {
        question.correctAnswer = target.dataset.answer;
        progress.answerOverrides[key] = target.dataset.answer;
      } else if (action === "clear-answer-key") {
        question.correctAnswer = "-";
        progress.answerOverrides[key] = "-";
      } else {
        question.correctAnswer = question.originalAnswer;
        delete progress.answerOverrides[key];
      }
      persistProgress();
      render();
      break;
    }
    default:
      break;
  }
}

if (typeof document !== "undefined" && app) {
  app.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if (target && !target.disabled) handleAction(target.dataset.action, target);
  });

  app.addEventListener("input", event => {
    if (event.target.id !== "battery-search") return;
    const cursor = event.target.selectionStart;
    state.query = event.target.value;
    render();
    const search = document.querySelector("#battery-search");
    search?.focus();
    search?.setSelectionRange(cursor, cursor);
  });
}

async function loadBatteries() {
  const results = await Promise.allSettled(BATTERY_FILES.map(async fileName => {
    const response = await fetch(`./data/${fileName}`);
    if (!response.ok) throw new Error(`${fileName}: HTTP ${response.status}`);
    const data = validateBattery(await response.json(), fileName);
    return { ...data, id: fileName };
  }));
  state.batteries = results
    .filter(result => result.status === "fulfilled")
    .map(result => result.value);
  state.batteryErrors = results
    .filter(result => result.status === "rejected")
    .map(result => result.reason.message);
  render();
}

async function initialize() {
  try {
    await loadBatteries();
  } catch (error) {
    state.notice = `No se pudieron cargar las baterías: ${error.message}`;
    state.noticeType = "error";
    render();
  }
}

if (typeof document !== "undefined") {
  initialize();

  const infoDialog = document.querySelector("#site-info");
  const acknowledgeInfo = document.querySelector("#info-acknowledge");
  if (infoDialog instanceof HTMLDialogElement && acknowledgeInfo instanceof HTMLButtonElement) {
    try {
      if (localStorage.getItem(INFO_ACK_KEY) !== "true") infoDialog.showModal();
    } catch {
      infoDialog.showModal();
    }

    acknowledgeInfo.addEventListener("click", () => {
      try {
        localStorage.setItem(INFO_ACK_KEY, "true");
        infoDialog.close();
      } catch (error) {
        state.notice = `No se pudo guardar que has leído el aviso: ${error.message}`;
        state.noticeType = "error";
        render();
        infoDialog.close();
      }
    });
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      state.notice = `La aplicación funciona, pero no se pudo activar el modo sin conexión: ${error.message}`;
      state.noticeType = "error";
      render();
    });
  }

  window.setInterval(() => {
    if (state.screen !== "quiz" || !state.quiz) return;
    const elapsed = Math.floor((Date.now() - state.quiz.startedAt) / 1000);
    const timer = document.querySelector("#quiz-timer");
    if (timer) timer.textContent = `${state.quiz.isSimulation ? "Restante" : "Tiempo"} · ${formatTime(state.quiz.isSimulation ? Math.max(0, 90 * 60 - elapsed) : elapsed)}`;
    if (state.quiz.isSimulation && elapsed >= 90 * 60) finishQuiz();
  }, 1000);
}
