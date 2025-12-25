// src/routes/examRoutes.ts
import { Router } from "express";
import examController from "../controllers/examController";

const router = Router();

// POST /api/crawl - 크롤링 & 저장
router.post("/crawl", examController.crawlAndSave);

// GET /api/exams - 시험 목록
router.get("/exams", examController.getExams);

// GET /api/exams/:id/questions - 문제 조회
router.get("/exams/:id/questions", examController.getExamQuestions);

export default router;
