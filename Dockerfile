FROM node:22-slim AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set minimumReleaseAge 0 && pnpm config set dangerouslyAllowAllBuilds true && pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ./node_modules/.bin/next build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3900
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json next.config.js ./
EXPOSE 3900
CMD ["./node_modules/.bin/next", "start", "-p", "3900"]
