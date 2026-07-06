FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vem exclusivamente do .env.production commitado (valores publicos).
# NUNCA declarar ARG/ENV NEXT_PUBLIC_* aqui: build-arg ausente vira string vazia,
# e env ja definida (mesmo vazia) faz o next build ignorar o .env.production.
ENV NEXT_TELEMETRY_DISABLED=1
RUN grep -q "^NEXT_PUBLIC_SUPABASE_URL=https://" .env.production || \
    (echo "ERRO: .env.production ausente do contexto de build ou sem NEXT_PUBLIC_SUPABASE_URL" && exit 1)
RUN npm run build
# Trava: a ref do projeto (extraida do .env.production) precisa estar embutida no
# bundle. Procurar so "supabase.co" nao vale — a propria lib @supabase contem essa string.
RUN REF=$(sed -n 's|^NEXT_PUBLIC_SUPABASE_URL=https://\([^.]*\)\.supabase\.co.*|\1|p' .env.production); \
    [ -n "$REF" ] && grep -q "$REF" .next/server/middleware.js && grep -rq "$REF" .next/static/chunks/ || \
    (echo "ERRO: envs NEXT_PUBLIC nao foram embutidas no bundle — build invalido" && exit 1)

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
