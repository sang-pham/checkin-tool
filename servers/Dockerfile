FROM node:16

WORKDIR /servers
COPY package.json .
RUN npm i
COPY . .
CMD node index.js