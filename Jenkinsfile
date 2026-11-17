pipeline {
    agent any

    options {
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        stage('Deploy') {
            when {
                expression {
                    return env.BRANCH_NAME == 'main' && (env.DEPLOY_DIR ?: '').trim().length() > 0
                }
            }
            steps {
                sh 'mkdir -p "$DEPLOY_DIR" && cp -R dist/. "$DEPLOY_DIR/"'
            }
        }
    }
}
