FROM node:18-alpine

WORKDIR /app

RUN npm install -g pm2 nodemon dotenv

COPY package.json ./

RUN npm install

RUN npm install yamljs

COPY . .

CMD if [ "$NODE_ENV" = "production" ]; then pm2-runtime ./src/server.js; else npm run dev; fi
