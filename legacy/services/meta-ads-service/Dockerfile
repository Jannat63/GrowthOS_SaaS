FROM node:22-slim
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
