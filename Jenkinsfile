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
                script {
                    if (isUnix()) {
                        sh 'npm ci'
                    } else {
                        bat 'npm ci'
                    }
                }
            }
        }

        stage('Test') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm test'
                    } else {
                        bat 'npm test'
                    }
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm run build'
                    } else {
                        bat 'npm run build'
                    }
                }
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
                script {
                    if (isUnix()) {
                        sh 'mkdir -p "$DEPLOY_DIR" && cp -R dist/. "$DEPLOY_DIR/"'
                    } else {
                        bat 'if not exist "%DEPLOY_DIR%" mkdir "%DEPLOY_DIR%"\r\nxcopy /E /I /Y "dist\\*" "%DEPLOY_DIR%"'
                    }
                }
            }
        }
    }
}
