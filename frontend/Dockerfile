FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=
ARG VITE_ADSENSE_CLIENT=
ARG VITE_ADSENSE_SLOT_HEADER=
ARG VITE_ADSENSE_SLOT_HOME=
ARG VITE_ADSENSE_SLOT_CONTENT=
ARG VITE_ADSENSE_SLOT_TOOL=
ARG VITE_ADSENSE_SLOT_FOOTER=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_ADSENSE_CLIENT=$VITE_ADSENSE_CLIENT \
    VITE_ADSENSE_SLOT_HEADER=$VITE_ADSENSE_SLOT_HEADER \
    VITE_ADSENSE_SLOT_HOME=$VITE_ADSENSE_SLOT_HOME \
    VITE_ADSENSE_SLOT_CONTENT=$VITE_ADSENSE_SLOT_CONTENT \
    VITE_ADSENSE_SLOT_TOOL=$VITE_ADSENSE_SLOT_TOOL \
    VITE_ADSENSE_SLOT_FOOTER=$VITE_ADSENSE_SLOT_FOOTER
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/nest/main.js"]
