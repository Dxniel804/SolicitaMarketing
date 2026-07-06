FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* sao inlined no bundle durante o build; precisam chegar como build args
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.production 2>/dev/null || [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] || \
    (echo "ERRO: variaveis NEXT_PUBLIC ausentes no build (.env.production nao encontrado e sem build-args)" && exit 1)
RUN npm run build
# Trava: falha o build se as envs publicas nao foram embutidas no bundle do middleware
RUN grep -q "supabase.co" .next/server/middleware.js || \
    (echo "ERRO: envs NEXT_PUBLIC nao foram embutidas no middleware — build invalido" && exit 1)

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.env.production ./.env.production
EXPOSE 3000
CMD ["node", "server.js"]
