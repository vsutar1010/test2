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

This repository includes a `Jenkinsfile` that defines the CI/CD pipeline. It checks out the code, installs dependencies, runs tests, builds the application, and archives `dist/`. On the `main` branch, it also copies the build to `DEPLOY_DIR` when that variable is configured.

### 1. Prepare Jenkins and its build agent

1. Install Jenkins and open its web interface. During initial setup, install the suggested plugins, including **Pipeline** and **Git** (or the SCM-source plugin for your Git provider).
2. Select or create a Linux build agent. The pipeline uses shell (`sh`) steps, so the agent must support them.
3. Install Node.js 20 or newer and npm on the agent, and ensure both `node` and `npm` are available on the agent's `PATH`. No Jenkins Node.js plugin is required.
4. Confirm the repository has been pushed to a Git server that Jenkins can access.

### 2. Create a Multibranch Pipeline job

1. From the Jenkins dashboard, select **New Item**.
2. Enter a job name, select **Multibranch Pipeline**, and choose **OK**.
3. Under **Branch Sources**, select **Add source** and choose the provider for your repository (for example, **GitHub** or **Git**).
4. Enter the repository URL. If it is private, select or add Jenkins credentials that have read access to it.
5. In **Build Configuration**, leave the script path as `Jenkinsfile`.
6. Under **Scan Multibranch Pipeline Triggers**, optionally enable periodic scans. If your Git provider is configured to send webhooks to Jenkins, configure its webhook trigger as well.
7. Select **Save**, then select **Scan Multibranch Pipeline Now** if Jenkins does not scan automatically. Jenkins should discover the `main` branch and create a branch job for it.

### 3. Run and verify CI

1. Open the discovered `main` branch job and select **Build Now** (or push a commit to trigger a build).
2. Open the running build and select **Console Output** to follow the stages:
   - **Checkout** retrieves the repository.
   - **Install** runs `npm ci`.
   - **Test** runs `npm test`; the build fails if any test fails.
   - **Build** runs `npm run build` and archives `dist/**` as a fingerprinted Jenkins artifact.
3. When the build succeeds, open the build's **Artifacts** section and verify that the generated application files are present.

### 4. Optional: deploy the build files

1. On the Jenkins agent, choose a directory where the Jenkins agent account is allowed to write the deployment files.
2. Configure `DEPLOY_DIR` as an environment variable for the agent or job. For example, on a node-based agent, open **Manage Jenkins → Nodes → [agent] → Configure → Node Properties → Environment variables**, add `DEPLOY_DIR` with the chosen path, and save. Folder-level environment variables can also be used if the required plugin is installed.
3. Run a build of the `main` branch. The **Deploy** stage runs only on `main` and only when `DEPLOY_DIR` is non-empty; it copies the contents of `dist/` to that directory.
4. On the deployment host, start the app from that directory with `node "$DEPLOY_DIR/server.js"`. It listens on port 3000 by default; set `PORT` to use a different port.

The deploy stage only copies files; it does not start, stop, or restart a service. Configure a service manager or container platform separately if you need the app to stay running or restart automatically. A regular Pipeline job can run checkout, install, test, and build, but this `Jenkinsfile`'s branch-gated deployment is intended for a Multibranch Pipeline job.

## Project layout

- `public/` — browser interface, styles, and client-side exam flow
- `server.js` — static-file server and exam/submission API
- `tests/` — API and validation tests using Node's built-in test runner
- `scripts/build.js` — creates the deployable `dist/` directory
- `Jenkinsfile` — CI pipeline and optional main-branch deployment
