# ============================================================
# Smart Task Manager - ONE-SHOT SETUP SCRIPT
# Run this from the task-manager-full root folder in PowerShell:
#   .\setup-all.ps1
# If PowerShell blocks it, run this once first:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# ============================================================

Write-Host ""
Write-Host "===== STEP 1: Backend setup =====" -ForegroundColor Green

if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "Created backend\.env from the template." -ForegroundColor Yellow
    Write-Host "STOP: Open backend\.env in VS Code now and fill in:" -ForegroundColor Yellow
    Write-Host "  - MONGO_URI (from MongoDB Atlas)"
    Write-Host "  - JWT_SECRET (any long random string)"
    Write-Host "  - EMAIL_USER / EMAIL_PASS (Gmail + App Password)"
    Write-Host "  - GEMINI_API_KEY (from https://aistudio.google.com/apikey)"
    Write-Host ""
    Read-Host "Press Enter here once you've saved backend\.env with real values"
} else {
    Write-Host "backend\.env already exists - skipping creation." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Green
Push-Location backend
npm install
Pop-Location

Write-Host ""
Write-Host "===== STEP 2: Start the backend server =====" -ForegroundColor Green
Write-Host "Opening the backend in a NEW terminal window (leave it running)." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev"

Write-Host ""
Write-Host "Waiting 5 seconds for the server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "===== STEP 3: Push to GitHub =====" -ForegroundColor Green

if (-not (Test-Path ".git")) {
    git init
    git add .
    git commit -m "Full combined version - auth, Kanban, AI insights, themes"
    git branch -M main

    $repoUrl = Read-Host "Paste your empty GitHub repo URL (e.g. https://github.com/you/repo.git)"
    if ($repoUrl) {
        git remote add origin $repoUrl
        git push -u origin main
        Write-Host "Pushed to GitHub." -ForegroundColor Green
    } else {
        Write-Host "No URL entered - skipped GitHub push. Run this later:" -ForegroundColor Yellow
        Write-Host "  git remote add origin <your-repo-url>"
        Write-Host "  git push -u origin main"
    }
} else {
    Write-Host "Git already initialized - staging and committing any new changes..." -ForegroundColor Yellow
    git add .
    git commit -m "Update"
    git push
}

Write-Host ""
Write-Host "===== STEP 4: Android - Capacitor setup and sync =====" -ForegroundColor Green

Write-Host "Before this step: open frontend\config.js and set API_URL to" -ForegroundColor Yellow
Write-Host "  http://10.0.2.2:5000/api   (Android emulator)" -ForegroundColor Yellow
Write-Host "  or your PC's local IP (real phone on same Wi-Fi)" -ForegroundColor Yellow
Read-Host "Press Enter once frontend\config.js is updated and saved"

Push-Location android
npm install

if (-not (Test-Path "android")) {
    Write-Host "Generating native Android project..." -ForegroundColor Green
    npm run add
} else {
    Write-Host "Native Android project already exists - skipping 'add'." -ForegroundColor Yellow
}

Write-Host "Syncing frontend into the native project..." -ForegroundColor Green
npm run sync

Write-Host "Opening Android Studio..." -ForegroundColor Green
npm run open

Pop-Location

Write-Host ""
Write-Host "===== ALL DONE =====" -ForegroundColor Green
Write-Host "Backend is running in its own window."
Write-Host "Android Studio should be opening now - wait for Gradle sync, then click Run."
