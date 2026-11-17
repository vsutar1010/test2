'use strict';

const app = document.querySelector('#app');
const candidateLabel = document.querySelector('#candidate-label');
const candidateAvatar = document.querySelector('#candidate-avatar');
document.querySelector('#current-year').textContent = new Date().getFullYear();

let exam;
let candidateName = '';
let answers = {};
let currentQuestion = 0;
let secondsRemaining = 0;
let timerInterval;
let submitting = false;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderError(message) {
  app.innerHTML = `<section class="notice-error" role="alert">${escapeHtml(message)}</section>
    <button class="button button-outline" id="retry-load" type="button">Try again</button>`;
  document.querySelector('#retry-load').addEventListener('click', loadExam);
}

async function loadExam() {
  try {
    const response = await fetch('/api/exam');
    if (!response.ok) throw new Error('The assessment could not be loaded.');
    exam = await response.json();
    renderWelcome();
  } catch (error) {
    renderError(error.message);
  }
}

function renderWelcome() {
  app.innerHTML = `
    <section class="welcome-card" aria-labelledby="welcome-title">
      <p class="eyebrow">Your assessment</p>
      <h1 id="welcome-title">${escapeHtml(exam.title)}</h1>
      <p class="intro-copy">${escapeHtml(exam.description)} Find a quiet place, check your connection, and give yourself enough time to complete each question.</p>
      <div class="exam-meta" aria-label="Assessment details">
        <span class="meta-chip">${exam.questions.length} questions</span>
        <span class="meta-chip">${exam.durationMinutes} minutes</span>
        <span class="meta-chip">Pass mark ${exam.passMark}%</span>
        <span class="meta-chip">Multiple choice</span>
      </div>
      <form class="welcome-form" id="start-form">
        <label for="candidate-name">Your name</label>
        <div class="welcome-form-row">
          <input id="candidate-name" name="candidateName" autocomplete="name" maxlength="80" placeholder="Enter your full name" required>
          <button class="button button-light" type="submit">Start exam <span aria-hidden="true">→</span></button>
        </div>
        <p class="error-message" id="start-error" role="alert"></p>
      </form>
    </section>
    <section class="welcome-details" aria-label="Before you begin">
      <article class="detail-card"><span class="detail-icon" aria-hidden="true">◷</span><strong>Timed assessment</strong><span>Your ${exam.durationMinutes}-minute timer begins when you start.</span></article>
      <article class="detail-card"><span class="detail-icon" aria-hidden="true">✓</span><strong>Save as you go</strong><span>Your answers stay selected as you move between questions.</span></article>
      <article class="detail-card"><span class="detail-icon" aria-hidden="true">◎</span><strong>Review your result</strong><span>See your score and explanations after submission.</span></article>
    </section>`;
  document.querySelector('#start-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.querySelector('#candidate-name').value.trim();
    if (name.length < 2) {
      document.querySelector('#start-error').textContent = 'Please enter a name with at least 2 characters.';
      return;
    }
    candidateName = name;
    candidateLabel.textContent = candidateName;
    candidateAvatar.textContent = candidateName.charAt(0).toUpperCase();
    secondsRemaining = exam.durationMinutes * 60;
    renderQuestion();
    timerInterval = window.setInterval(tick, 1000);
  });
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function tick() {
  secondsRemaining = Math.max(0, secondsRemaining - 1);
  const timer = document.querySelector('#timer');
  if (timer) {
    timer.textContent = formatTime(secondsRemaining);
    timer.closest('.timer-card').classList.toggle('is-low', secondsRemaining <= 60);
  }
  if (secondsRemaining === 0) submitExam();
}

function renderQuestion() {
  const question = exam.questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  app.innerHTML = `
    <header class="exam-heading">
      <div>
        <p class="eyebrow">Assessment in progress</p>
        <h1>${escapeHtml(exam.title)}</h1>
        <p class="muted">Choose the best answer for each question.</p>
      </div>
      <div class="timer-card" aria-label="Time remaining">
        <span class="timer-label">Time remaining</span>
        <span class="timer-value" id="timer">${formatTime(secondsRemaining)}</span>
      </div>
    </header>
    <div class="exam-layout">
      <aside class="exam-sidebar" aria-label="Question navigation">
        <h2 class="sidebar-title">Your questions</h2>
        <p class="sidebar-copy">Select a number to move between questions.</p>
        <nav class="question-nav" aria-label="Questions">
          ${exam.questions.map((item, index) => `<button type="button" class="${index === currentQuestion ? 'current' : ''} ${answers[item.id] ? 'answered' : ''}" aria-label="Question ${index + 1}${answers[item.id] ? ', answered' : ''}" aria-current="${index === currentQuestion ? 'step' : 'false'}" data-question="${index}">${index + 1}</button>`).join('')}
        </nav>
        <div class="legend" aria-label="Question status legend">
          <span><i class="legend-current"></i> Current question</span>
          <span><i class="legend-answered"></i> Answered</span>
          <span><i></i> Not answered</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-label"><span>Progress</span><span>${answeredCount}/${exam.questions.length} answered</span></div>
          <div class="progress-track" role="progressbar" aria-valuenow="${answeredCount}" aria-valuemin="0" aria-valuemax="${exam.questions.length}">
            <div class="progress-fill" style="width:${(answeredCount / exam.questions.length) * 100}%"></div>
          </div>
        </div>
      </aside>
      <section class="question-card" aria-labelledby="question-text">
        <div class="question-overline"><span>Question ${currentQuestion + 1} of ${exam.questions.length}</span><span class="question-number">Q${String(currentQuestion + 1).padStart(2, '0')}</span></div>
        <h2 class="question-text" id="question-text">${escapeHtml(question.text)}</h2>
        <div class="answer-list" role="radiogroup" aria-label="Answer choices">
          ${question.options.map((option, index) => `
            <label class="answer-option ${answers[question.id] === option.id ? 'selected' : ''}">
              <input type="radio" name="answer" value="${escapeHtml(option.id)}" ${answers[question.id] === option.id ? 'checked' : ''}>
              <span class="choice-letter">${String.fromCharCode(65 + index)}</span>
              <span class="choice-text">${escapeHtml(option.text)}</span>
            </label>`).join('')}
        </div>
        <div class="question-footer">
          <button class="button button-outline" id="previous-question" type="button" ${currentQuestion === 0 ? 'disabled' : ''}>← Previous</button>
          <div class="question-footer-right">
            ${currentQuestion === exam.questions.length - 1
              ? '<button class="button" id="submit-exam" type="button">Submit exam <span aria-hidden="true">→</span></button>'
              : '<button class="button" id="next-question" type="button">Next question <span aria-hidden="true">→</span></button>'}
          </div>
        </div>
        <p class="exam-notice">Your progress is kept in this browser while you complete the assessment. Do not refresh or close this page.</p>
      </section>
    </div>`;

  document.querySelectorAll('[data-question]').forEach((button) => {
    button.addEventListener('click', () => {
      currentQuestion = Number(button.dataset.question);
      renderQuestion();
    });
  });
  document.querySelectorAll('input[name="answer"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      answers[question.id] = radio.value;
      renderQuestion();
    });
  });
  document.querySelector('#previous-question').addEventListener('click', () => {
    if (currentQuestion > 0) {
      currentQuestion -= 1;
      renderQuestion();
    }
  });
  document.querySelector('#next-question')?.addEventListener('click', () => {
    if (currentQuestion < exam.questions.length - 1) {
      currentQuestion += 1;
      renderQuestion();
    }
  });
  document.querySelector('#submit-exam')?.addEventListener('click', () => {
    const unanswered = exam.questions.findIndex((item) => !answers[item.id]);
    if (unanswered !== -1) {
      currentQuestion = unanswered;
      renderQuestion();
      const notice = document.querySelector('.exam-notice');
      notice.textContent = 'Answer every question before submitting. We moved to the first unanswered question.';
      notice.setAttribute('role', 'status');
      return;
    }
    submitExam();
  });
}

async function submitExam() {
  if (submitting) return;
  submitting = true;
  window.clearInterval(timerInterval);
  try {
    const response = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId: exam.id,
        candidateName,
        answers: Object.fromEntries(exam.questions.map(({ id }) => [id, answers[id] || null]))
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your answers could not be submitted.');
    renderResults(result);
  } catch (error) {
    submitting = false;
    app.insertAdjacentHTML('afterbegin', `<div class="notice-error" role="alert">${escapeHtml(error.message)} Your answers are still available; <button class="retry-button" id="retry-submit" type="button">try submitting again</button>.</div>`);
    document.querySelector('#retry-submit').addEventListener('click', () => submitExam());
  }
}

function renderResults(result) {
  app.innerHTML = `
    <section class="result-card" aria-labelledby="result-title">
      <header class="result-banner">
        <div class="result-icon" aria-hidden="true">${result.passed ? '✓' : '↗'}</div>
        <h1 id="result-title">${result.passed ? 'Assessment complete' : 'Submission received'}</h1>
        <p>${result.passed ? 'Congratulations, you reached the pass mark.' : 'Review your answers below and keep learning.'}</p>
      </header>
      <div class="result-body">
        <div class="score-grid" aria-label="Your result">
          <div class="score-item"><strong>${result.score}%</strong><span>YOUR SCORE</span></div>
          <div class="score-item"><strong>${result.correctCount}/${result.totalQuestions}</strong><span>CORRECT ANSWERS</span></div>
          <div class="score-item"><strong>${result.passed ? 'Passed' : 'Not passed'}</strong><span>PASS MARK ${exam.passMark}%</span></div>
        </div>
        <h2>Answer review</h2>
        <div class="review-list">
          ${result.results.map((item, index) => {
            const question = exam.questions.find(({ id }) => id === item.questionId);
            const selected = question.options.find(({ id }) => id === item.selectedOption);
            const correct = question.options.find(({ id }) => id === item.correctOption);
            return `<article class="review-item">
              <div class="review-top"><span>Question ${index + 1}: ${escapeHtml(question.text)}</span><span class="${item.isCorrect ? 'correct' : 'incorrect'}">${item.isCorrect ? 'Correct' : 'Review'}</span></div>
              <p>Your answer: ${selected ? escapeHtml(selected.text) : 'No answer selected'}${item.isCorrect ? '' : ` · Correct answer: ${escapeHtml(correct.text)}`}. ${escapeHtml(item.explanation)}</p>
            </article>`;
          }).join('')}
        </div>
        <div class="review-actions"><button class="button button-outline" id="restart-exam" type="button">Return to overview</button></div>
      </div>
    </section>`;
  document.querySelector('#restart-exam').addEventListener('click', () => {
    candidateName = '';
    answers = {};
    currentQuestion = 0;
    submitting = false;
    candidateLabel.textContent = 'Candidate';
    candidateAvatar.textContent = 'C';
    renderWelcome();
  });
}

loadExam();
