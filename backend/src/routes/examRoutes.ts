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
 *         exams:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               title:
 *                 type: string
 *               year:
 *                 type: integer
 *               examType:
 *                 type: integer
 *               totalQuestions:
 *                 type: integer
 *               createdAt:
 *                 type: string
 *                 format: date-time
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
 *           type: object
 *           description: 문제 ID를 키로, 선택한 답안 번호를 값으로 하는 객체
 *           example:
 *             "1": 2
 *             "2": 3
 *             "3": 1
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
 * /api/crawl:
 *   post:
 *     summary: 시험 문제 크롤링 및 저장
 *     tags: [Crawl]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrawlRequest'
 *     responses:
 *       200:
 *         description: 크롤링 및 저장 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 잘못된 요청 (URL 누락)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 크롤링 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *                   $ref: '#/components/schemas/SubjectDetail'
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
 *                     $ref: '#/components/schemas/Exam'
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
 * /api/exams:
 *   get:
 *     summary: 시험 목록 조회
 *     tags: [Exams]
 *     parameters:
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: 과목명으로 필터링 (선택사항)
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
 *                     $ref: '#/components/schemas/Exam'
 *       500:
 *         description: 시험 조회 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/exams", examController.getExams);

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
