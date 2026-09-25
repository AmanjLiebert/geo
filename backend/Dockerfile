FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S geo && adduser -S geo -G geo
COPY --from=build --chown=geo:geo /app/package.json /app/package-lock.json ./
COPY --from=build --chown=geo:geo /app/node_modules ./node_modules
COPY --from=build --chown=geo:geo /app/dist ./dist
USER geo
EXPOSE 4000
CMD ["node", "dist/main.js"]
