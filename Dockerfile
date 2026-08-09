FROM node:20-alpine AS workspace-deps
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm install

FROM workspace-deps AS frontend-builder
COPY apps/frontend ./apps/frontend
WORKDIR /workspace/apps/frontend
RUN npm run build

FROM node:20-alpine AS backend
WORKDIR /app
COPY apps/backend/package.json ./
RUN npm install --omit=dev
COPY apps/backend ./
EXPOSE 5000
CMD ["node", "src/server.js"]

FROM nginx:1.27-alpine AS frontend
COPY deploy/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /workspace/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
