FROM node:22-alpine

WORKDIR /app

# 只复制后端相关文件（避免前端node_modules等干扰）
COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

EXPOSE 3001

CMD ["node", "src/index.js"]
