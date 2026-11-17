'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const exam = {
  id: 'web-foundations',
  title: 'Foundations of Web Development',
  description: 'A short assessment of core HTML, CSS, JavaScript, and HTTP concepts.',
  durationMinutes: 15,
  passMark: 70,
  questions: [
    {
      id: 'q1',
      text: 'Which HTML element is intended for the main content unique to a page?',
      options: [
        { id: 'a', text: '<aside>' },
        { id: 'b', text: '<main>' },
        { id: 'c', text: '<footer>' },
        { id: 'd', text: '<head>' }
      ],
      correctOption: 'b',
      explanation: 'The <main> element identifies the primary content of the document.'
    },
    {
      id: 'q2',
      text: 'Which CSS layout system is designed for arranging items along one dimension?',
      options: [
        { id: 'a', text: 'Flexbox' },
        { id: 'b', text: 'CSS Grid' },
        { id: 'c', text: 'Float layout' },
        { id: 'd', text: 'Position: fixed' }
      ],
      correctOption: 'a',
      explanation: 'Flexbox is suited to one-dimensional rows or columns; Grid handles two-dimensional layouts.'
    },
    {
      id: 'q3',
      text: 'What does the `===` operator check in JavaScript?',
      options: [
        { id: 'a', text: 'Whether two values are equal after conversion' },
        { id: 'b', text: 'Whether two variables point to the same object only' },
        { id: 'c', text: 'Whether value and type are both equal' },
        { id: 'd', text: 'Whether the left value is greater than the right value' }
      ],
      correctOption: 'c',
      explanation: 'Strict equality compares without coercing the operand types.'
    },
    {
      id: 'q4',
      text: 'Which HTTP method is commonly used to retrieve a resource without changing it?',
      options: [
        { id: 'a', text: 'POST' },
        { id: 'b', text: 'PATCH' },
        { id: 'c', text: 'DELETE' },
        { id: 'd', text: 'GET' }
      ],
      correctOption: 'd',
      explanation: 'GET requests retrieve a representation and should not modify server state.'
    },
    {
      id: 'q5',
      text: 'Which attribute provides alternative text for an informative image?',
      options: [
        { id: 'a', text: 'title' },
        { id: 'b', text: 'alt' },
        { id: 'c', text: 'caption' },
        { id: 'd', text: 'role' }
      ],
      correctOption: 'b',
      explanation: 'The alt attribute provides a text alternative for an image.'
    }
  ]
};

const publicFiles = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8']
};
const MAX_BODY_BYTES = 16 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        tooLarge = true;
        body = '';
      }
    });
    request.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('Request body is too large.'), { statusCode: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function publicExam() {
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    passMark: exam.passMark,
    questions: exam.questions.map(({ id, text, options }) => ({ id, text, options }))
  };
}

function validateSubmission(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Request must be a JSON object.';
  }
  if (payload.examId !== exam.id) {
    return 'The requested exam was not found.';
  }
  if (typeof payload.candidateName !== 'string'
      || payload.candidateName.trim().length < 2
      || payload.candidateName.trim().length > 80) {
    return 'Candidate name must be between 2 and 80 characters.';
  }
  if (!payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) {
    return 'Answers must be provided as an object.';
  }

  const questionIds = exam.questions.map(({ id }) => id);
  const answerIds = Object.keys(payload.answers);
  if (answerIds.length !== questionIds.length || questionIds.some((id) => !answerIds.includes(id))) {
    return 'Submit exactly one answer for every question.';
  }
  for (const question of exam.questions) {
    if (payload.answers[question.id] !== null
        && !question.options.some(({ id }) => id === payload.answers[question.id])) {
      return `Answer for ${question.id} is not a valid choice.`;
    }
  }
  return null;
}

function createServer() {
  const submissions = [];
  const staticRoot = path.join(__dirname, 'public');

  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');

    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, { status: 'ok' });
    }
    if (request.method === 'GET' && url.pathname === '/api/exam') {
      return sendJson(response, 200, publicExam());
    }
    if (request.method === 'POST' && url.pathname === '/api/submissions') {
      let payload;
      try {
        payload = await readJsonBody(request);
      } catch (error) {
        if (!response.destroyed) {
          return sendJson(response, error.statusCode || 400, { error: error.message });
        }
        return;
      }

      const validationError = validateSubmission(payload);
      if (validationError) {
        const statusCode = validationError.includes('not found') ? 404 : 400;
        return sendJson(response, statusCode, { error: validationError });
      }

      const results = exam.questions.map((question) => ({
        questionId: question.id,
        selectedOption: payload.answers[question.id],
        correctOption: question.correctOption,
        isCorrect: payload.answers[question.id] === question.correctOption,
        explanation: question.explanation
      }));
      const correctCount = results.filter(({ isCorrect }) => isCorrect).length;
      const score = Math.round((correctCount / exam.questions.length) * 100);
      const submission = {
        id: randomUUID(),
        candidateName: payload.candidateName.trim(),
        score,
        correctCount,
        totalQuestions: exam.questions.length,
        passed: score >= exam.passMark,
        submittedAt: new Date().toISOString(),
        results
      };
      submissions.push(submission);
      return sendJson(response, 201, submission);
    }

    if (request.method === 'GET' && publicFiles[url.pathname]) {
      const [filename, contentType] = publicFiles[url.pathname];
      const filePath = path.join(staticRoot, filename);
      try {
        const file = await fs.promises.readFile(filePath);
        response.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache'
        });
        return response.end(file);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        return sendJson(response, 404, { error: 'Application file not found.' });
      }
    }

    return sendJson(response, 404, { error: 'Not found.' });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer();
  server.listen(port, () => {
    console.log(`Examly is listening on http://localhost:${port}`);
  });
}

module.exports = { createServer };
