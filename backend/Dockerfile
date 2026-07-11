FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm install --production
COPY . ./
EXPOSE 8001
CMD ["node", "server.js"]
