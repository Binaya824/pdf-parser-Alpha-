FROM node:18-alpine

WORKDIR /app

RUN yarn global add pm2 nodemon dotenv

COPY package.json ./

COPY yarn.lock ./

RUN yarn

COPY . .

CMD if [ "$NODE_ENV" = "production" ]; then pm2-runtime ./src/server.js; else npm run dev; fi