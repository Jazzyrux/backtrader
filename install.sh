#!/bin/bash

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Installation des dépendances pour le projet Trading Platform...${NC}"

# Vérifier si Python est installé
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python3 n'est pas installé. Veuillez l'installer d'abord.${NC}"
    exit 1
fi

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js n'est pas installé. Veuillez l'installer d'abord.${NC}"
    exit 1
fi

# Créer et activer l'environnement virtuel Python
echo -e "${YELLOW}Création de l'environnement virtuel Python...${NC}"
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances Python
echo -e "${YELLOW}Installation des dépendances Python...${NC}"
pip install --upgrade pip
pip install -r backend/requirements.txt

# Installer les dépendances Node.js
echo -e "${YELLOW}Installation des dépendances Node.js...${NC}"
cd frontend
npm install

# Retour au répertoire racine
cd ..

echo -e "${GREEN}Installation terminée avec succès!${NC}"
echo -e "${YELLOW}Pour démarrer le projet:${NC}"
echo -e "1. Backend: ${GREEN}source venv/bin/activate && cd backend && uvicorn app.main:app --reload${NC}"
echo -e "2. Frontend: ${GREEN}cd frontend && npm run dev${NC}" 