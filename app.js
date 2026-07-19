let bank = null;
let allQuestions = [];
let questions = [];
let currentIndex = 0;
let answers = {};
let secondsLeft = 0;
let timerInterval = null;
let timeMinutes = 120;

const STORAGE_KEY = 'simulado_used_question_ids';

const screenStart = document.getElementById('screen-start');
const screenQuiz = document.getElementById('screen-quiz');
const screenResult = document.getElementById('screen-result');

function showScreen(el) {
  [screenStart, screenQuiz, screenResult].forEach(s => s.classList.add('hidden'));
  el.classList.remove('hidden');
}

fetch('question-bank.json')
  .then(r => r.json())
  .then(data => {
    bank = data;
    allQuestions = data.questions;
    document.getElementById('start-title').textContent = `Simulado - ${data.examTitle}`;
    document.getElementById('bank-info').textContent =
      `Banco de questões disponível: ${allQuestions.length} questões.`;
    document.getElementById('input-quantity').max = allQuestions.length;
    if (Number(document.getElementById('input-quantity').value) > allQuestions.length) {
      document.getElementById('input-quantity').value = allQuestions.length;
    }
    generateQuiz(false);
  })
  .catch(err => {
    document.getElementById('start-title').textContent = 'Erro ao carregar question-bank.json';
    console.error(err);
  });

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getUsedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveUsedIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

// Seleciona N questões, proporcionalmente distribuídas pelos tópicos do banco,
// priorizando questões ainda não usadas recentemente (reseta quando o banco se esgota).
function pickQuestions(quantity) {
  const byTopic = {};
  allQuestions.forEach(q => {
    if (!byTopic[q.topic]) byTopic[q.topic] = [];
    byTopic[q.topic].push(q);
  });

  let used = getUsedIds();
  const totalAvailableUnused = allQuestions.filter(q => !used.has(q.id)).length;
  if (totalAvailableUnused < quantity) {
    used = new Set(); // banco esgotado: reinicia o ciclo de repetição
  }

  const topics = Object.keys(byTopic);
  const totalQuestions = allQuestions.length;
  const selected = [];

  topics.forEach(topic => {
    const topicQuestions = byTopic[topic];
    const proportion = topicQuestions.length / totalQuestions;
    const count = Math.max(1, Math.round(proportion * quantity));
    const unused = shuffle(topicQuestions.filter(q => !used.has(q.id)));
    const usedOnes = shuffle(topicQuestions.filter(q => used.has(q.id)));
    const pool = [...unused, ...usedOnes];
    selected.push(...pool.slice(0, count));
  });

  let finalSelection = shuffle(selected).slice(0, quantity);

  // Se a distribuição proporcional não atingiu a quantidade pedida, completa com o restante do banco.
  if (finalSelection.length < quantity) {
    const chosenIds = new Set(finalSelection.map(q => q.id));
    const remaining = shuffle(allQuestions.filter(q => !chosenIds.has(q.id)));
    finalSelection = finalSelection.concat(remaining.slice(0, quantity - finalSelection.length));
  }

  // Observação: as questões só são marcadas como "vistas" quando o simulado é
  // de fato FINALIZADO (ver finishQuiz) — gerar/pré-visualizar não consome o
  // histórico, então você pode clicar em "Gerar novo simulado" à vontade.
  return finalSelection;
}

function markQuestionsAsUsed(qs) {
  const used = getUsedIds();
  qs.forEach(q => used.add(q.id));
  saveUsedIds(used);
}

function generateQuiz(isManual) {
  const quantity = Math.min(
    Math.max(1, Number(document.getElementById('input-quantity').value) || 63),
    allQuestions.length
  );
  timeMinutes = Math.max(1, Number(document.getElementById('input-minutes').value) || 120);

  questions = shuffle(pickQuestions(quantity));
  document.getElementById('start-title').textContent =
    `Simulado - ${bank.examTitle} - Quantidade: ${questions.length} questões`;

  const bankInfo = document.getElementById('bank-info');
  if (isManual) {
    bankInfo.textContent =
      `✅ Novo simulado gerado! ${questions.length} questões sorteadas (de ${allQuestions.length} no banco), embaralhadas. Tempo: ${timeMinutes} minutos.`;
    bankInfo.classList.remove('flash');
    void bankInfo.offsetWidth; // força reflow para reiniciar a animação
    bankInfo.classList.add('flash');
  } else {
    bankInfo.textContent =
      `Banco de questões disponível: ${allQuestions.length} questões. Clique em "Gerar novo simulado" para sortear um novo conjunto.`;
  }
}

document.getElementById('btn-generate').addEventListener('click', () => generateQuiz(true));
document.getElementById('btn-start').addEventListener('click', startQuiz);
document.getElementById('btn-prev').addEventListener('click', () => navigate(-1));
document.getElementById('btn-next').addEventListener('click', () => navigate(1));
document.getElementById('btn-finish').addEventListener('click', attemptFinish);
document.getElementById('btn-restart').addEventListener('click', () => location.reload());

function startQuiz() {
  if (!questions.length) generateQuiz();
  currentIndex = 0;
  answers = {};
  secondsLeft = timeMinutes * 60;
  showScreen(screenQuiz);
  renderQuestion();
  startTimer();
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    secondsLeft--;
    updateTimerDisplay();
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      finishQuiz();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const el = document.getElementById('quiz-timer');
  el.textContent = `⏱ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  el.classList.toggle('warning', secondsLeft <= 60);
}

function renderQuestion() {
  const q = questions[currentIndex];
  const total = questions.length;

  document.getElementById('question-counter').textContent = `Questão ${currentIndex + 1} de ${total}`;
  document.getElementById('progress-bar').style.width = `${((currentIndex) / total) * 100}%`;

  const ctxEl = document.getElementById('question-context');
  if (q.context && q.context.trim()) {
    ctxEl.textContent = q.context;
    ctxEl.classList.remove('hidden');
  } else {
    ctxEl.classList.add('hidden');
  }

  document.getElementById('question-text').textContent = q.text;

  const isMultiple = q.type === 'multiple' && q.correctCount > 1;
  document.getElementById('question-hint').textContent =
    isMultiple ? `Selecione ${q.correctCount} opções.` : '';

  const optionsList = document.getElementById('options-list');
  optionsList.innerHTML = '';
  const savedAnswer = answers[q.id] || [];

  q.options.forEach(opt => {
    const wrapper = document.createElement('div');
    wrapper.className = 'option';

    const input = document.createElement('input');
    input.type = isMultiple ? 'checkbox' : 'radio';
    input.name = `q-${q.id}`;
    input.id = `q-${q.id}-${opt.key}`;
    input.value = opt.key;
    input.checked = savedAnswer.includes(opt.key);

    input.addEventListener('change', () => handleOptionChange(q, opt.key, isMultiple));

    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = `${opt.key}. ${opt.text}`;

    wrapper.appendChild(input);
    wrapper.appendChild(label);
    wrapper.addEventListener('click', (e) => {
      if (e.target !== input) input.click();
    });

    optionsList.appendChild(wrapper);
  });

  document.getElementById('btn-prev').disabled = currentIndex === 0;
  const isLast = currentIndex === total - 1;
  document.getElementById('btn-next').classList.toggle('hidden', isLast);
  // O botão "finalizar agora" fica sempre visível, permitindo encerrar a qualquer momento.
}

function handleOptionChange(q, key, isMultiple) {
  let current = answers[q.id] || [];
  if (isMultiple) {
    if (current.includes(key)) {
      current = current.filter(k => k !== key);
    } else {
      current = [...current, key];
      if (current.length > q.correctCount) {
        current.shift();
        renderQuestion();
        answers[q.id] = current;
        return;
      }
    }
  } else {
    current = [key];
  }
  answers[q.id] = current;
}

function navigate(direction) {
  currentIndex += direction;
  renderQuestion();
}

function attemptFinish() {
  const answeredCount = questions.filter(q => (answers[q.id] || []).length > 0).length;
  const total = questions.length;

  if (answeredCount === 0) {
    alert('Você ainda não respondeu nenhuma questão. Responda pelo menos uma antes de finalizar.');
    return;
  }

  if (answeredCount < total) {
    const ok = confirm(
      `Você respondeu ${answeredCount} de ${total} questões.\n\n` +
      `Deseja finalizar agora e conferir o resultado apenas das questões que você respondeu?`
    );
    if (!ok) return;
  }

  finishQuiz();
}

function finishQuiz() {
  clearInterval(timerInterval);
  showScreen(screenResult);

  // Considera apenas as questões efetivamente respondidas (finalização parcial permitida).
  const answeredQuestions = questions.filter(q => (answers[q.id] || []).length > 0);
  markQuestionsAsUsed(answeredQuestions);

  let correctCount = 0;
  const reviewEl = document.getElementById('result-review');
  reviewEl.innerHTML = '';

  answeredQuestions.forEach((q, idx) => {
    const given = (answers[q.id] || []).slice().sort();
    const correct = q.correct.slice().sort();
    const isCorrect = given.length === correct.length && given.every((v, i) => v === correct[i]);
    if (isCorrect) correctCount++;

    const item = document.createElement('div');
    item.className = `review-item ${isCorrect ? 'is-correct' : 'is-wrong'}`;

    const optionsHtml = q.options.map(opt => {
      const wasGiven = given.includes(opt.key);
      const isRight = correct.includes(opt.key);
      let icon = '';
      let cls = 'review-option';
      if (isRight) {
        icon = '<span class="opt-icon opt-correct">&#10003;</span>';
        cls += ' opt-is-correct';
      } else if (wasGiven && !isRight) {
        icon = '<span class="opt-icon opt-incorrect">&#10007;</span>';
        cls += ' opt-is-incorrect';
      } else {
        icon = '<span class="opt-icon opt-neutral"></span>';
      }
      return `<div class="${cls}">${icon}${opt.key}. ${escapeHtml(opt.text)}</div>`;
    }).join('');

    const explanationHtml = q.explanation
      ? `<div class="explanation-box ${isCorrect ? 'explanation-correct' : 'explanation-wrong'}">
           <div class="explanation-title">${isCorrect ? '📘 Por que essa é a resposta certa' : '👩‍🏫 Explicação do professor'}</div>
           <div class="explanation-text">${escapeHtml(q.explanation).replace(/\n/g, '<br>')}</div>
         </div>`
      : '';

    item.innerHTML = `
      <div class="q-text">${idx + 1}. ${escapeHtml(q.text)}</div>
      <div class="review-options">${optionsHtml}</div>
      ${explanationHtml}
    `;
    reviewEl.appendChild(item);
  });

  const answered = answeredQuestions.length;
  const totalSelected = questions.length;
  const pct = answered ? Math.round((correctCount / answered) * 100) : 0;
  document.getElementById('result-score').textContent =
    `${correctCount} / ${answered} corretas (${pct}%)`;

  const usedSeconds = timeMinutes * 60 - secondsLeft;
  const m = Math.floor(usedSeconds / 60);
  const s = usedSeconds % 60;
  const partialInfo = answered < totalSelected
    ? ` · Finalizado após ${answered} de ${totalSelected} questões selecionadas`
    : '';
  document.getElementById('result-time').textContent =
    `Tempo utilizado: ${m}min ${s}s${partialInfo}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
