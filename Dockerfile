# BelajarTenun – image app: web pemula (React, dibangun di tahap 1) + API Node.
FROM node:22-slim AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web ./
COPY public/js /src/public/js
COPY public/vendor /src/public/vendor
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json server.js ./
COPY lib ./lib
COPY public ./public
COPY --from=web /src/web/dist ./web/dist
COPY data/modules ./data/modules
COPY data/knowledge.json data/taxonomy.json ./data/
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8080
HEALTHCHECK CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
