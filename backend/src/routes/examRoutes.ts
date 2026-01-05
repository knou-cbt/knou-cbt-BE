// src/routes/examRoutes.ts
import { Router } from "express";
import examController from "../controllers/examController";
import subjectController from "../controllers/subjectController";


const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CrawlRequest:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         url:
 *           type: string
 *           description: 크롤링할 시험 문제 페이지 URL
 *           example: "https://example.com/exam"
 *         forceRetry:
 *           type: boolean
 *           description: 부분적으로 저장된 데이터가 있을 경우 삭제 후 재시도 여부
 *           default: false
 *           example: false
 *     
 *     Subject:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     SubjectWithCount:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         examCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     SubjectDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         examCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         total:
 *           type: integer
 *         totalPages:
 *           type: integer
 *     
 *     Exam:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         subjectId:
 *           type: integer
 *         year:
 *           type: integer
 *         examType:
 *           type: integer
 *         title:
 *           type: string
 *         totalQuestions:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         subject:
 *           $ref: '#/components/schemas/Subject'
 *     
 *     Choice:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         questionId:
 *           type: integer
 *         choiceNumber:
 *           type: integer
 *         choiceText:
 *           type: string
 *         choiceImageUrl:
 *           type: string
 *           nullable: true
 *     
 *     Question:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         examId:
 *           type: integer
 *         questionNumber:
 *           type: integer
 *         questionText:
 *           type: string
 *         questionImageUrl:
 *           type: string
 *           nullable: true
 *         correctAnswer:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         choices:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Choice'
 *     
 *     SubmitRequest:
 *       type: object
 *       required:
 *         - answers
 *       properties:
 *         answers:
 *           type: array
 *           description: 답안 배열
 *           items:
 *             type: object
 *             required:
 *               - questionId
 *               - selectedAnswer
 *             properties:
 *               questionId:
 *                 type: integer
 *                 description: 문제 ID
 *               selectedAnswer:
 *                 type: integer
 *                 description: 선택한 답안 번호
 *           example:
 *             - questionId: 1282
 *               selectedAnswer: 4
 *             - questionId: 1283
 *               selectedAnswer: 2
 *     
 *     SubmitResult:
 *       type: object
 *       properties:
 *         examId:
 *           type: integer
 *         totalQuestions:
 *           type: integer
 *         correctCount:
 *           type: integer
 *         score:
 *           type: integer
 *         results:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: integer
 *               questionNumber:
 *                 type: integer
 *               userAnswer:
 *                 type: integer
 *               correctAnswer:
 *                 type: integer
 *               isCorrect:
 *                 type: boolean
 *     
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /api/crawl/batch:
 *   post:
 *     summary: 여러 시험 문제를 순차적으로 크롤링 및 저장
 *     description: |
 *       여러 URL을 한 번에 받아서 순차적으로 크롤링합니다.
 *       동시 트랜잭션 충돌을 방지하기 위해 순차 처리됩니다.
 *     tags: [Crawl]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 크롤링할 URL 배열
 *                 example: ["https://example.com/exam1", "https://example.com/exam2"]
 *               forceRetry:
 *                 type: boolean
 *                 description: 부분 저장 재시도 여부
 *                 default: false
 *     responses:
 *       200:
 *         description: 배치 크롤링 완료 (일부 실패 포함 가능)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: 잘못된 요청
 *       500:
 *         description: 배치 크롤링 실패
 */
router.post("/crawl/batch", examController.crawlBatch);

/**
 * @swagger
 * /api/crawl:
 *   post:
 *     summary: 시험 문제 크롤링 및 저장
 *     description: |
 *       올에이클래스 시험 페이지를 크롤링하여 DB에 저장합니다.
 *       
 *       **중복 체크:**
 *       - 같은 과목, 연도, 시험 유형의 시험이 이미 존재하면 에러를 반환합니다.
 *       - 부분적으로 저장된 경우 (문제 수가 맞지 않음) `forceRetry: true`로 재시도 가능합니다.
 *       
 *       **트랜잭션:**
 *       - 전체 저장 과정이 하나의 트랜잭션으로 처리됩니다.
 *       - 중간에 실패하면 자동으로 롤백됩니다.
 *     tags: [Crawl]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrawlRequest'
 *           examples:
 *             normal:
 *               summary: 일반 크롤링
 *               value:
 *                 url: "https://example.com/exam"
 *             retry:
 *               summary: 부분 저장 재시도
 *               value:
 *                 url: "https://example.com/exam"
 *                 forceRetry: true
 *     responses:
 *       200:
 *         description: 크롤링 및 저장 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     examId:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: "사회복지학개론 2024학년도 하계학기"
 *                     questionCount:
 *                       type: integer
 *                       example: 50
 *       400:
 *         description: 잘못된 요청 (URL 누락)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 크롤링 실패 (중복 시험, 부분 저장 등)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               duplicate:
 *                 summary: 중복 시험
 *                 value:
 *                   error: "크롤링 실패"
 *                   message: "이미 존재하는 시험입니다: 사회복지학개론 2024학년도 하계학기 (ID: 1)"
 *               partial:
 *                 summary: 부분 저장
 *                 value:
 *                   error: "크롤링 실패"
 *                   message: "부분적으로 저장된 시험이 있습니다: 사회복지학개론 2024학년도 하계학기 (ID: 1, 저장된 문제: 30/50)\n다시 시도하려면 forceRetry 옵션을 사용하세요."
 */
router.post("/crawl", examController.crawlAndSave);

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     summary: 과목 목록 조회 (검색 + 페이지네이션)
 *     tags: [Subjects]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 과목명 검색어
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 과목 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     subjects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SubjectWithCount'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: 과목 목록 조회 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/subjects", subjectController.getSubjects);

/**
 * @swagger
 * /api/subjects/{id}:
 *   get:
 *     summary: 특정 과목의 상세 정보 조회
 *     tags: [Subjects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 과목 ID
 *     responses:
 *       200:
 *         description: 과목 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     examCount:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: 과목을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 과목 조회 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/subjects/:id", subjectController.getSubjectById);

/**
 * @swagger
 * /api/subjects/{subjectId}/exams:
 *   get:
 *     summary: 특정 과목의 시험지 목록 조회
 *     tags: [Subjects]
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 과목 ID
 *     responses:
 *       200:
 *         description: 시험 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       subjectId:
 *                         type: integer
 *                       year:
 *                         type: integer
 *                       examType:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       totalQuestions:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: 시험 목록 조회 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/subjects/:subjectId/exams", subjectController.getExamsBySubject);

/**
 * @swagger
 * /api/exams/{id}/questions:
 *   get:
 *     summary: 시험 문제 조회
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 시험 ID
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [study, test]
 *         description: study 모드일 경우 정답 포함, test 모드는 정답 미포함
 *     responses:
 *       200:
 *         description: 시험 문제 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     exam:
 *                       $ref: '#/components/schemas/Exam'
 *                     questions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Question'
 *       500:
 *         description: 문제 조회 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/exams/:id/questions", examController.getExamQuestions);

/**
 * @swagger
 * /api/exams/{id}/submit:
 *   post:
 *     summary: 시험 답안 제출 및 채점
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 시험 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitRequest'
 *     responses:
 *       200:
 *         description: 답안 제출 및 채점 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SubmitResult'
 *       400:
 *         description: 잘못된 요청 (답안 누락)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 시험을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 답안 제출 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/exams/:id/submit", examController.submitExam);

export default router;
