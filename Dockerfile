# ── Build client ──
FROM node:20-alpine AS client-build
WORKDIR /app
COPY package.json ./
COPY client/package.json client/
RUN cd client && npm install
COPY client/ client/
RUN cd client && npx vite build

# ── Production ──
FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 ffmpeg curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY server/package.json server/
RUN cd server && npm install
COPY server/ server/
COPY --from=client-build /app/client/dist client/dist

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npx", "tsx", "server/src/index.ts"]
