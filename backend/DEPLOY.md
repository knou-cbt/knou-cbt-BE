# 서버 배포 가이드

## 1. 서버 준비

### 필수 요구사항
- Node.js 18 이상
- PostgreSQL 14 이상 (또는 사용 중인 데이터베이스)
- PM2 (프로세스 매니저, 선택사항)

### PM2 설치 (선택사항)
```bash
npm install -g pm2
```

## 2. 프로젝트 배포

### 2.1 서버에 프로젝트 업로드
```bash
# Git을 사용하는 경우
git clone <repository-url>
cd knou-cbt-BE/backend

# 또는 파일을 직접 업로드한 경우
cd backend
```

### 2.2 의존성 설치
```bash
npm install --production
```

### 2.3 환경 변수 설정
`.env` 파일을 생성하고 필요한 환경 변수를 설정합니다:

```bash
# env.example 파일을 복사하여 .env 파일 생성
cp env.example .env
```

또는 직접 `.env` 파일을 생성하고 다음 내용을 입력합니다:

```env
# 데이터베이스 연결
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# 서버 포트 (선택사항, 기본값: 3000)
PORT=3000

# Node 환경 (development | production)
NODE_ENV=production

# API URL (Swagger 문서용, 선택사항)
API_URL=http://your-server-ip:3000
```

> **참고**: `env.example` 파일을 참고하여 필요한 환경 변수를 설정하세요.

### 2.4 데이터베이스 마이그레이션
```bash
# Prisma 클라이언트 생성
npm run prisma:generate

# 데이터베이스 마이그레이션 적용
npm run prisma:deploy
```

### 2.5 빌드
```bash
# 프로덕션 빌드 (Prisma 클라이언트 생성 + TypeScript 컴파일)
npm run build:prod
```

## 3. 서버 실행

### 방법 1: PM2 사용 (권장)

#### PM2로 시작
```bash
pm2 start ecosystem.config.js --env production
```

#### PM2 명령어
```bash
# 상태 확인
pm2 status

# 로그 확인
pm2 logs knou-cbt-api

# 재시작
pm2 restart knou-cbt-api

# 중지
pm2 stop knou-cbt-api

# 삭제
pm2 delete knou-cbt-api

# 서버 재부팅 시 자동 시작 설정
pm2 startup
pm2 save
```

### 방법 2: 직접 실행
```bash
npm run start:prod
```

### 방법 3: systemd 서비스 (Linux)

`/etc/systemd/system/knou-cbt-api.service` 파일 생성:

```ini
[Unit]
Description=KNOU CBT API Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/knou-cbt-BE/backend
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/path/to/knou-cbt-BE/backend/.env

[Install]
WantedBy=multi-user.target
```

서비스 관리:
```bash
# 서비스 시작
sudo systemctl start knou-cbt-api

# 서비스 활성화 (부팅 시 자동 시작)
sudo systemctl enable knou-cbt-api

# 상태 확인
sudo systemctl status knou-cbt-api

# 로그 확인
sudo journalctl -u knou-cbt-api -f
```

## 4. 업데이트 배포

```bash
# 코드 업데이트 후
git pull  # 또는 새 파일 업로드

# 의존성 업데이트
npm install --production

# 데이터베이스 마이그레이션 (필요한 경우)
npm run prisma:deploy

# 빌드
npm run build:prod

# 재시작
pm2 restart knou-cbt-api
# 또는
sudo systemctl restart knou-cbt-api
```

## 5. 리버스 프록시 설정 (Nginx 예시)

`/etc/nginx/sites-available/knou-cbt-api`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

활성화:
```bash
sudo ln -s /etc/nginx/sites-available/knou-cbt-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. 로그 디렉토리 생성

PM2를 사용하는 경우 로그 디렉토리를 생성합니다:

```bash
mkdir -p logs
```

## 7. 포트 방화벽 설정

```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 8. 헬스 체크

서버가 정상적으로 실행되었는지 확인:

```bash
curl http://localhost:3000/health
```

응답: `{"status":"ok"}`

API 문서 확인:
- `http://your-server:3000/api-docs`

