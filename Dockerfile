FROM node:22-alpine AS workspace-deps
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm ci --no-audit --no-fund

FROM workspace-deps AS frontend-builder
COPY apps/frontend ./apps/frontend
WORKDIR /workspace/apps/frontend
RUN npm run build

FROM node:22-alpine AS backend-deps
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm ci --omit=dev --workspace=apps/backend --no-audit --no-fund

FROM backend-deps AS backend
COPY apps/backend ./apps/backend
WORKDIR /workspace/apps/backend
EXPOSE 5000
CMD ["node", "src/server.js"]

FROM backend-deps AS migrator
COPY apps/backend ./apps/backend
COPY scripts ./scripts
WORKDIR /workspace
CMD ["sh", "-c", "node --input-type=module -e 'import(\"./apps/backend/src/config/env.js\")' && node scripts/db-migrate-all.mjs && node scripts/seed-platform-admin.mjs"]

FROM nginx:1.27-alpine AS frontend
COPY deploy/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /workspace/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
