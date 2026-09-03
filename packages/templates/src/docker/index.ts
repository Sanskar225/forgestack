export function renderBackendDockerfileTemplate(port: number, hasPrisma: boolean) {
  return `# Production Multi-stage Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
${hasPrisma ? 'COPY prisma ./prisma/' : ''}
RUN npm ci
COPY . .
RUN npm run build
${hasPrisma ? 'RUN npx prisma generate' : ''}

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 forgestack
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
${hasPrisma ? 'COPY --from=builder /app/prisma ./prisma\nCOPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma\nCOPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma' : ''}
RUN npm ci --only=production
USER forgestack
EXPOSE ${port}
CMD ["node", "dist/index.js"]
`;
}
