# 방송대 CBT 시스템

방송통신대학교 기출문제를 CBT(Computer Based Test)로 제공하는 시스템

## 프로젝트 구조
```
knou-cbt-BE/
├── backend/          # Node.js + TypeScript API 서버
│   ├── src/
│   ├── prisma/
│   └── uploads/
└── python-extractor/ # Python Flask PDF 추출 서비스
    ├── uploads/
    └── output/
```

## 기술 스택

### Backend
- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL

### Python Extractor
- Flask
- pypdf, pdfplumber
- Pillow

## 개발 환경 요구사항

- Node.js v18+
- Python 3.9+
- PostgreSQL 14+

## 설치 및 실행

### Backend
```bash
cd backend
npm install
npm run dev
```

### Python Extractor
```bash
cd python-extractor
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Git Flow

이 프로젝트는 Git Flow 브랜치 전략을 사용합니다.
```bash
# 새 기능 개발
git flow feature start feature-name

# 기능 완료
git flow feature finish feature-name
```
