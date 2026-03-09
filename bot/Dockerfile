FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install --verbose  # подробный вывод установки

COPY . .

EXPOSE 3000
CMD ["node", "bot.js"]
