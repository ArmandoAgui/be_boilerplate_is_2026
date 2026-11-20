# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# Generate only: this placeholder never connects to a real database.
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder npm ci

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/src ./src
COPY . .
RUN npm run build && npm prune --omit=dev --ignore-scripts

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="SONNET 5 backend" \
      org.opencontainers.image.revision="${VCS_REF}"
ENV NODE_ENV=production UPLOADS_DIR=/uploads PORT=3000 CHECKPOINT_DISABLE=1
RUN mkdir -p /uploads && chown node:node /uploads && chmod 750 /uploads
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# Retain generated TS client for the existing explicit development seed command.
COPY --from=builder /app/src/generated ./src/generated
COPY --chown=node:node --chmod=755 deploy/runtime-entrypoint.sh ./deploy/runtime-entrypoint.sh
COPY --chown=node:node deploy/crear-admin.mjs deploy/migrar.mjs deploy/importar-condominio.mjs deploy/seed-demo.mjs ./deploy/
USER node
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health/ready',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./deploy/runtime-entrypoint.sh"]
CMD ["node", "dist/main.js"]
