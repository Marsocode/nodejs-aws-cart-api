FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

RUN npm run build


FROM node:20-alpine AS prod-dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=prod-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package*.json ./

USER node

EXPOSE 8080

CMD ["npm", "run", "start:prod"]