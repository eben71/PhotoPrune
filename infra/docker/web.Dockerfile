FROM node:20-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY scripts/prepare-lefthook.cjs ./scripts/prepare-lefthook.cjs

COPY apps/web/package.json apps/web/tsconfig.json apps/web/next.config.js apps/web/next-env.d.ts apps/web/eslint.config.mjs apps/web/.prettierrc apps/web/vitest.config.mts apps/web/vitest.setup.ts ./apps/web/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/

RUN pnpm install

COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

RUN NODE_ENV=production pnpm --filter web build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/package.json ./apps/web/package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared ./packages/shared

WORKDIR /app/apps/web
CMD ["pnpm", "start"]
