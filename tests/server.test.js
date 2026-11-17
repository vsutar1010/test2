'use strict';

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createServer } = require('../server');

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('health endpoint reports that the service is available', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('exam endpoint returns questions without revealing answers', async () => {
  const response = await fetch(`${baseUrl}/api/exam`);
  const exam = await response.json();

  assert.equal(response.status, 200);
  assert.equal(exam.questions.length, 5);
  assert.ok(exam.questions.every((question) => !('correctOption' in question)));
  assert.ok(exam.questions.every((question) => !('explanation' in question)));
});

test('submission endpoint validates answers and returns scored explanations', async () => {
  const response = await fetch(`${baseUrl}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: 'web-foundations',
      candidateName: 'Ada Lovelace',
      answers: { q1: 'b', q2: 'a', q3: 'c', q4: 'd', q5: 'b' }
    })
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.score, 100);
  assert.equal(result.correctCount, 5);
  assert.equal(result.passed, true);
  assert.equal(result.results.length, 5);
  assert.ok(result.results.every(({ explanation }) => explanation.length > 0));
});

test('submission endpoint scores unanswered questions as incorrect', async () => {
  const response = await fetch(`${baseUrl}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: 'web-foundations',
      candidateName: 'Ada Lovelace',
      answers: { q1: 'b', q2: null, q3: null, q4: null, q5: null }
    })
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.score, 20);
  assert.equal(result.results[1].selectedOption, null);
  assert.equal(result.results[1].isCorrect, false);
});

test('submission endpoint rejects missing answers and invalid names', async () => {
  const incompleteResponse = await fetch(`${baseUrl}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: 'web-foundations',
      candidateName: 'Ada',
      answers: { q1: 'b' }
    })
  });
  assert.equal(incompleteResponse.status, 400);
  assert.match((await incompleteResponse.json()).error, /every question/);

  const invalidNameResponse = await fetch(`${baseUrl}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: 'web-foundations',
      candidateName: ' ',
      answers: { q1: 'b', q2: 'a', q3: 'c', q4: 'd', q5: 'b' }
    })
  });
  assert.equal(invalidNameResponse.status, 400);
  assert.match((await invalidNameResponse.json()).error, /Candidate name/);
});
