@echo off
echo Installation des dependances pour le projet Trading Platform...

REM Verifier si Python est installe
python --version >nul 2>&1
if errorlevel 1 (
    echo Python n'est pas installe. Veuillez l'installer d'abord.
    exit /b 1
)

REM Verifier si Node.js est installe
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js n'est pas installe. Veuillez l'installer d'abord.
    exit /b 1
)

REM Creer et activer l'environnement virtuel Python
echo Creation de l'environnement virtuel Python...
python -m venv venv
call venv\Scripts\activate

REM Installer les dependances Python
echo Installation des dependances Python...
python -m pip install --upgrade pip
pip install -r backend\requirements.txt

REM Installer les dependances Node.js
echo Installation des dependances Node.js...
cd frontend
npm install
cd ..

echo Installation terminee avec succes!
echo Pour demarrer le projet:
echo 1. Backend: venv\Scripts\activate ^&^& cd backend ^&^& uvicorn app.main:app --reload
echo 2. Frontend: cd frontend ^&^& npm run dev

pause 