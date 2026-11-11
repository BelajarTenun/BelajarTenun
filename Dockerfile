# BelajarTenun – image produksi (Cloud Run). Tanpa dependency npm.
FROM node:22-slim
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data
WORKDIR /app
COPY package.json server.js ./
COPY lib ./lib
COPY public ./public
COPY data/modules ./data/modules
COPY data/knowledge.json ./data/knowledge.json
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8080
HEALTHCHECK CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
