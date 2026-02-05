#!/bin/bash

# Скрипт для автоматического развертывания на VPS
# Использование: ./deploy.sh

set -e  # Остановка при ошибке

echo "🚀 Начало развертывания..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка, что скрипт запущен из корня проекта
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Ошибка: Запустите скрипт из корня проекта${NC}"
    exit 1
fi

# Переменные
PROJECT_DIR="/var/www/reyohoho"
BACKEND_DIR="$PROJECT_DIR/backend"

echo -e "${YELLOW}📦 Установка зависимостей фронтенда...${NC}"
npm install || yarn install

echo -e "${YELLOW}🔨 Сборка фронтенда...${NC}"
npm run build || yarn build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Ошибка: Директория dist не создана${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Установка зависимостей бэкенда...${NC}"
cd backend
npm install || yarn install

# Создание .env для бэкенда, если не существует
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Создание .env для бэкенда...${NC}"
    cat > .env << EOF
PORT=8000
NODE_ENV=production
EOF
    echo -e "${GREEN}✅ Файл .env создан${NC}"
fi

cd ..

echo -e "${GREEN}✅ Сборка завершена!${NC}"
echo ""
echo -e "${YELLOW}📋 Следующие шаги:${NC}"
echo "1. Скопируйте проект на сервер:"
echo "   scp -r . root@your-server-ip:/var/www/reyohoho"
echo ""
echo "2. На сервере выполните:"
echo "   cd /var/www/reyohoho/backend"
echo "   pm2 start server.js --name reyohoho-backend"
echo "   pm2 save"
echo ""
echo "3. Настройте Nginx (см. VPS_DEPLOYMENT.md)"
echo "4. Настройте SSL: sudo certbot --nginx -d yourdomain.com"
