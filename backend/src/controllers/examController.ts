// src/controllers/examController.ts
import { Request, Response } from "express";
import questionService from "../services/questionService";
import prisma from "../lib/prisma";

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


	/**
	 * POST /api/exams/:id/submit
	 * 시험 답안 제출 및 채점
	 */
	async submitExam(req: Request, res: Response) {
		try {
			const examId = parseInt(req.params.id);
			const { answers } = req.body; // { questionId: choiceNumber }

			if (!answers || typeof answers !== "object") {
				return res.status(400).json({
					error: "답안이 필요합니다",
				});
			}

			// 시험 문제 조회
			const exam = await prisma.exam.findUnique({
				where: { id: examId },
				include: {
					questions: {
						select: {
							id: true,
							questionNumber: true,
							correctAnswer: true,
						},
					},
				},
			});

			if (!exam) {
				return res.status(404).json({
					error: "시험을 찾을 수 없습니다",
				});
			}

			// 채점
			let correctCount = 0;
			const results = exam.questions.map((q) => {
				const userAnswer = answers[q.id];
				const isCorrect = userAnswer === q.correctAnswer;

				if (isCorrect) correctCount++;

				return {
					questionId: q.id,
					questionNumber: q.questionNumber,
					userAnswer,
					correctAnswer: q.correctAnswer,
					isCorrect,
				};
			});

			const score = Math.round((correctCount / exam.questions.length) * 100);

			return res.json({
				success: true,
				data: {
					examId: exam.id,
					totalQuestions: exam.questions.length,
					correctCount,
					score,
					results,
				},
			});
		} catch (error: any) {
			console.error("답안 제출 에러:", error);
			return res.status(500).json({
				error: "답안 제출 실패",
				message: error.message,
			});
		}
	}
}

export default new ExamController();
