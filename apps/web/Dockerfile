FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# NEXT_PUBLIC_* vars are inlined into the client bundle at BUILD time, not
# runtime. Setting `environment: NEXT_PUBLIC_API_URL: ...` in docker-compose
# alone has NO effect on the already-built static bundle — that only
# affects the running container, which is too late. It happened to still
# "work" here by coincidence (the client-side fallback default matches the
# intended value), but changing the value in docker-compose.yml would
# silently do nothing without this fix. Standard Next.js Docker pattern:
# accept it as a build ARG and export it as an ENV before building.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
