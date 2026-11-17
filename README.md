# Examly

A lightweight online examination demo built with Node.js. Candidates can take a timed multiple-choice exam, navigate between questions, submit answers, and review their score and explanations. The server validates submissions and keeps them in memory for the lifetime of the process.

## Requirements

- Node.js 20 or newer
- npm (included with Node.js)
- Jenkins with a Pipeline or Multibranch Pipeline job for CI/CD

The application has no third-party npm dependencies.

## Run locally

From the repository root:

```sh
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000). Enter a candidate name and select **Start exam**. The exam timer begins when the exam starts; answers are submitted automatically when it expires.

To run the checks and build the deployable application:

```sh
npm test
npm run build
```

The self-contained application is written to `dist/`. Start the built version with:

```sh
node dist/server.js
```

It uses port 3000 by default. Set `PORT` to choose another port, for example `PORT=8080 node dist/server.js`.

## Exam API

- `GET /api/exam` — exam details and answer choices (does not reveal correct answers).
- `POST /api/submissions` — submit `{ "examId": "web-foundations", "candidateName": "Ada", "answers": { "q1": "b", "q2": "a", "q3": "c", "q4": "d", "q5": "b" } }`; include every question ID, using `null` for unanswered questions. Returns the score, pass status, and answer explanations.
- `GET /health` — process health check.

Submissions are held in memory and are lost when the server restarts. This demo does not include candidate accounts, an exam-authoring interface, a database, or production-grade identity controls.

## Jenkins CI/CD experiment

1. Install Node.js 20+ on the Jenkins agent and make `node` and `npm` available on `PATH`. No Jenkins-specific Node plugin is required.
2. Push this repository to a Git server accessible by Jenkins.
3. In Jenkins, create a **Multibranch Pipeline** pointed at the repository and ensure it discovers the `main` branch. (A regular Pipeline job can run CI; the branch-specific deployment stage is intended for Multibranch Pipeline.)
4. Run the job. The pipeline checks out the source, runs `npm ci`, executes `npm test`, builds `dist/`, and archives the build as a Jenkins artifact.
5. To enable the deploy stage, configure the Jenkins job/agent with a `DEPLOY_DIR` environment variable pointing to the target directory. On `main`, the pipeline copies the contents of `dist/` there. The destination must be writable by the Jenkins agent.
6. To serve the deployed build, run `node "$DEPLOY_DIR/server.js"` on the target host (setting `PORT` if needed). The pipeline publishes files but does not manage a long-running service; connect the deploy stage to your service manager/container platform if automatic restarts are required.

## Project layout

- `public/` — browser interface, styles, and client-side exam flow
- `server.js` — static-file server and exam/submission API
- `tests/` — API and validation tests using Node's built-in test runner
- `scripts/build.js` — creates the deployable `dist/` directory
- `Jenkinsfile` — CI pipeline and optional main-branch deployment
