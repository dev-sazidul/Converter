FROM node:22-alpine AS build

# better-sqlite3 is a native module. These build it when no prebuilt binary fits the platform.
RUN apk add --no-cache python3 make g++

WORKDIR /app
ENV CHECKPOINT_DISABLE=1 \
    NEXT_TELEMETRY_DISABLED=1
# npm ci runs `prisma generate`, which needs the schema and config.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
COPY src/lib/database-url.ts ./src/lib/database-url.ts
RUN npm ci
COPY . .
ARG SITE_URL=http://127.0.0.1:3000
ARG NEXT_PUBLIC_ADSENSE_CLIENT=
ARG NEXT_PUBLIC_ADSENSE_SLOT_HEADER=
ARG NEXT_PUBLIC_ADSENSE_SLOT_HOME=
ARG NEXT_PUBLIC_ADSENSE_SLOT_CONTENT=
ARG NEXT_PUBLIC_ADSENSE_SLOT_TOOL=
ARG NEXT_PUBLIC_ADSENSE_SLOT_FOOTER=
ENV SITE_URL=$SITE_URL \
    NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT \
    NEXT_PUBLIC_ADSENSE_SLOT_HEADER=$NEXT_PUBLIC_ADSENSE_SLOT_HEADER \
    NEXT_PUBLIC_ADSENSE_SLOT_HOME=$NEXT_PUBLIC_ADSENSE_SLOT_HOME \
    NEXT_PUBLIC_ADSENSE_SLOT_CONTENT=$NEXT_PUBLIC_ADSENSE_SLOT_CONTENT \
    NEXT_PUBLIC_ADSENSE_SLOT_TOOL=$NEXT_PUBLIC_ADSENSE_SLOT_TOOL \
    NEXT_PUBLIC_ADSENSE_SLOT_FOOTER=$NEXT_PUBLIC_ADSENSE_SLOT_FOOTER
RUN npm run build


# The Prisma CLI, kept apart from the app, applies migrations when the container starts.
FROM node:22-alpine AS migrate
WORKDIR /migrate
ENV CHECKPOINT_DISABLE=1
COPY package.json /tmp/package.json
RUN npm install --no-save --no-package-lock --no-audit --no-fund \
        "prisma@$(node -p "require('/tmp/package.json').devDependencies.prisma")" \
    && rm /tmp/package.json
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src/lib/database-url.ts ./src/lib/database-url.ts


FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/db/app.db
COPY --from=migrate /migrate /migrate
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY docker-start.sh /usr/local/bin/convarter-start
# sed drops CR characters in case the image is built from a Windows checkout.
RUN sed -i 's/\r$//' /usr/local/bin/convarter-start \
    && chmod 755 /usr/local/bin/convarter-start \
    && mkdir -p /data/db \
    && chown node:node /data/db

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["convarter-start"]
