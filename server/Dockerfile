# Stage 1: install everything and compile TypeScript to dist/
FROM node:24-slim AS build
WORKDIR /app

# Dependency files first: this layer is cached until package*.json changes
COPY package.json package-lock.json ./
RUN npm ci

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Stage 2: only what is needed to run
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# The node image ships a non-root user; do not run the server as root
USER node

EXPOSE 3000
ENV PORT=3000

CMD ["node", "dist/main"]
