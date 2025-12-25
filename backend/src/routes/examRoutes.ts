// src/routes/examRoutes.ts
import { Router } from "express";
import examController from "../controllers/examController";

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

export default router;
