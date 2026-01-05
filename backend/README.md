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

## API 문서

### Base URL
- Development: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api-docs`

---

## 📚 크롤링 API

### POST /api/crawl
올에이클래스 시험 페이지를 크롤링하여 DB에 저장합니다.

**Request Body:**
```json
{
  "url": "https://example.com/exam",
  "forceRetry": false  // optional, 부분 저장 재시도 여부
}
```

**Response (성공):**
```json
{
  "success": true,
  "data": {
    "examId": 1,
    "title": "사회복지학개론 2024학년도 하계학기",
    "questionCount": 50
  }
}
```

**Response (중복 시험):**
```json
{
  "error": "크롤링 실패",
  "message": "이미 존재하는 시험입니다: 사회복지학개론 2024학년도 하계학기 (ID: 1)"
}
```

**Response (부분 저장):**
```json
{
  "error": "크롤링 실패",
  "message": "부분적으로 저장된 시험이 있습니다: 사회복지학개론 2024학년도 하계학기 (ID: 1, 저장된 문제: 30/50)\n다시 시도하려면 forceRetry 옵션을 사용하세요."
}
```

**프론트엔드 처리 예시:**
```typescript
// 1차 시도
try {
  const response = await fetch('/api/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: examUrl })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message);
  }
  
  console.log('크롤링 완료:', result.data);
  
} catch (error) {
  // 부분 저장 에러인 경우
  if (error.message.includes('부분적으로 저장된')) {
    if (confirm('부분적으로 저장된 데이터가 있습니다. 삭제하고 다시 시도하시겠습니까?')) {
      // forceRetry: true로 재시도
      const retryResponse = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: examUrl, forceRetry: true })
      });
      
      const retryResult = await retryResponse.json();
      console.log('재시도 완료:', retryResult.data);
    }
  } else {
    console.error('크롤링 실패:', error.message);
  }
}
```

**특징:**
- 중복 체크: 같은 과목, 연도, 시험 유형의 시험 중복 저장 방지
- 트랜잭션: 전체 저장 과정이 하나의 트랜잭션으로 처리
- 자동 롤백: 중간에 실패하면 자동으로 롤백
- 재시도 옵션: `forceRetry: true`로 부분 저장된 데이터 삭제 후 재시도

**CLI 명령어:**
```bash
# 일반 크롤링
npm run crawl <URL>

# 부분 저장 재시도
npm run crawl <URL> --retry
```

---

## 📖 과목 API

### GET /api/subjects
과목 목록을 조회합니다. (검색 + 페이지네이션)

**Query Parameters:**
- `search` (optional): 과목명 검색어
- `page` (optional, default: 1): 페이지 번호
- `limit` (optional, default: 10): 페이지당 항목 수

**Response:**
```json
{
  "success": true,
  "data": {
    "subjects": [
      {
        "id": 1,
        "name": "사회복지학개론",
        "examCount": 10,
        "createdAt": "2024-12-29T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### GET /api/subjects/:id
특정 과목의 상세 정보를 조회합니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "사회복지학개론",
    "examCount": 10,
    "exams": [
      {
        "id": 1,
        "title": "사회복지학개론 2024학년도 하계학기",
        "year": 2024,
        "examType": 3,
        "totalQuestions": 50,
        "createdAt": "2024-12-29T00:00:00.000Z"
      }
    ],
    "createdAt": "2024-12-29T00:00:00.000Z"
  }
}
```

### GET /api/subjects/:subjectId/exams
특정 과목의 시험지 목록을 조회합니다.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "subjectId": 1,
      "year": 2024,
      "examType": 3,
      "title": "사회복지학개론 2024학년도 하계학기",
      "totalQuestions": 50,
      "createdAt": "2024-12-29T00:00:00.000Z",
      "subject": {
        "id": 1,
        "name": "사회복지학개론",
        "createdAt": "2024-12-29T00:00:00.000Z"
      }
    }
  ]
}
```

---

## 📝 시험 API

### GET /api/exams
시험 목록을 조회합니다.

**Query Parameters:**
- `subject` (optional): 과목명으로 필터링

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "subjectId": 1,
      "year": 2024,
      "examType": 3,
      "title": "사회복지학개론 2024학년도 하계학기",
      "totalQuestions": 50,
      "createdAt": "2024-12-29T00:00:00.000Z",
      "subject": {
        "id": 1,
        "name": "사회복지학개론",
        "createdAt": "2024-12-29T00:00:00.000Z"
      }
    }
  ]
}
```

### GET /api/exams/:id/questions
시험 문제를 조회합니다.

**Query Parameters:**
- `mode` (optional): `study` 또는 `test`
  - `study`: 정답 포함
  - `test`: 정답 미포함 (기본값)

**Response (test 모드):**
```json
{
  "success": true,
  "data": {
    "exam": {
      "id": 1,
      "title": "사회복지학개론 2024학년도 하계학기",
      "subject": "사회복지학개론",
      "totalQuestions": 50
    },
    "questions": [
      {
        "id": 1,
        "number": 1,
        "text": "다음 중 옳은 것은?",
        "imageUrl": "https://example.com/image.png",
        "choices": [
          {
            "number": 1,
            "text": "선택지 1",
            "imageUrl": null
          },
          {
            "number": 2,
            "text": "선택지 2",
            "imageUrl": null
          }
        ]
      }
    ]
  }
}
```

**Response (study 모드):**
```json
{
  "success": true,
  "data": {
    "exam": {
      "id": 1,
      "title": "사회복지학개론 2024학년도 하계학기",
      "subject": "사회복지학개론",
      "totalQuestions": 50
    },
    "questions": [
      {
        "id": 1,
        "number": 1,
        "text": "다음 중 옳은 것은?",
        "imageUrl": "https://example.com/image.png",
        "correctAnswer": 2,
        "choices": [
          {
            "number": 1,
            "text": "선택지 1",
            "imageUrl": null,
            "isCorrect": false
          },
          {
            "number": 2,
            "text": "선택지 2",
            "imageUrl": null,
            "isCorrect": true
          }
        ]
      }
    ]
  }
}
```

### POST /api/exams/:id/submit
시험 답안을 제출하고 채점합니다.

**Request Body:**
```json
{
  "answers": {
    "1": 2,
    "2": 3,
    "3": 1
  }
}
```
> Key: 문제 ID, Value: 선택한 답안 번호

**Response:**
```json
{
  "success": true,
  "data": {
    "examId": 1,
    "totalQuestions": 50,
    "correctCount": 45,
    "score": 90,
    "results": [
      {
        "questionId": 1,
        "questionNumber": 1,
        "userAnswer": 2,
        "correctAnswer": 2,
        "isCorrect": true
      },
      {
        "questionId": 2,
        "questionNumber": 2,
        "userAnswer": 3,
        "correctAnswer": 3,
        "isCorrect": true
      }
    ]
  }
}
```

---

## 📊 데이터 모델

### 시험 유형 (examType)
- `1`: 1학기 기말고사
- `2`: 2학기 기말고사
- `3`: 하계학기 시험
- `4`: 동계학기 시험

### 이미지 처리
- 문제 이미지: `questionImageUrl` (단일)
- 선택지 이미지: `choiceImageUrl` (각 선택지별)
- 크롤링 시 `alla6QuestionTr` 및 `alla6ExampleTr_Img` 행의 이미지 자동 추출

---

## Git Flow

이 프로젝트는 Git Flow 브랜치 전략을 사용합니다.
```bash
# 새 기능 개발
git flow feature start feature-name

# 기능 완료
git flow feature finish feature-name
```
