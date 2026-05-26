# 1단계: 빌드 — node 위에서 vite production build
FROM node:20-alpine AS builder
WORKDIR /app

# 의존성 캐시 — package-lock 만 먼저 복사하면 소스 변경에도 layer 재사용
COPY package.json package-lock.json ./
# host(macOS arm64) 와 컨테이너(linux/amd64) 사이 platform-specific deps 불일치로
# `npm ci` 가 막힘. lock 무시하고 install 하되 빌드 자체는 결정적 (package.json 핀 버전 기준).
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# 2단계: 런타임 — nginx 가 정적 파일만 서빙. SPA 라우팅은 nginx.conf 에서.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
