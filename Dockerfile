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

FROM node:22-alpine AS backend
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm ci --omit=dev --workspace=apps/backend --no-audit --no-fund
COPY apps/backend ./apps/backend
WORKDIR /workspace/apps/backend
EXPOSE 5000
CMD ["node", "src/server.js"]

FROM nginx:1.27-alpine AS frontend
COPY deploy/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /workspace/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
