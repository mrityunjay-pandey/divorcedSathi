# Multi-stage build for @divorcedsathi/api, run from the monorepo root
# (build context = repo root) so npm workspace deps resolve correctly.
#
# Render usage: set Dockerfile Path to apps/api/Dockerfile and
# Docker Build Context Directory to the repo root ("." or "/").

FROM node:20-slim AS builder
WORKDIR /repo

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install --include-workspace-root

COPY packages/db packages/db
COPY packages/shared packages/shared
COPY apps/api apps/api

# Prisma generate needs network access to binaries.prisma.sh at build time —
# this step runs on Render's build machines, not in a network-restricted
# sandbox, so it works normally there.
RUN npm run generate --workspace=@divorcedsathi/db
RUN npm run build --workspace=@divorcedsathi/api

FROM node:20-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=builder /repo/node_modules node_modules
COPY --from=builder /repo/package.json package.json
COPY --from=builder /repo/apps/api apps/api
COPY --from=builder /repo/packages packages

WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --schema=/repo/packages/db/prisma/schema.prisma && node dist/main.js"]
