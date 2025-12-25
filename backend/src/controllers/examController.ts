// src/controllers/examController.ts
import { Request, Response } from "express";
import questionService from "../services/questionService";

class ExamController {
	/**
	 * POST /api/crawl
	 * URL에서 크롤링 후 저장
	 */
	async crawlAndSave(req: Request, res: Response) {
		try {
			const { url } = req.body;

			if (!url) {
				return res.status(400).json({ error: "URL이 필요합니다" });
			}

			const result = await questionService.saveExamFromUrl(url);

			return res.json({
				success: true,
				data: result,
			});
		} catch (error: any) {
			console.error("크롤링 에러:", error);
			return res.status(500).json({
				error: "크롤링 실패",
				message: error.message,
			});
		}
	}

	/**
	 * GET /api/exams
	 * 시험 목록 조회
	 */
	async getExams(req: Request, res: Response) {
		try {
			const { subject } = req.query;

			const exams = await questionService.getExams(subject as string);

			return res.json({
				success: true,
				data: exams,
			});
		} catch (error: any) {
			console.error("시험 조회 에러:", error);
			return res.status(500).json({
				error: "시험 조회 실패",
				message: error.message,
			});
		}
	}

	/**
	 * GET /api/exams/:id/questions
	 * 시험 문제 조회
	 */
	async getExamQuestions(req: Request, res: Response) {
		try {
			const examId = parseInt(req.params.id);
			const includeAnswers = req.query.mode === "study"; // ?mode=study

			const exam = await questionService.getExamQuestions(examId, includeAnswers);

			return res.json({
				success: true,
				data: exam,
			});
		} catch (error: any) {
			console.error("문제 조회 에러:", error);
			return res.status(500).json({
				error: "문제 조회 실패",
				message: error.message,
			});
		}
	}
}

export default new ExamController();
