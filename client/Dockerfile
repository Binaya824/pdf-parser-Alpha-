FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm i --legacy-peer-deps

COPY . .

## EXPOSE [Port you mentioned in the vite.config file]

EXPOSE 5173

CMD ["npm", "run", "dev"]