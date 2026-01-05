// src/controllers/examController.ts
import { Request, Response } from "express";
import questionService from "../services/questionService";
import prisma from "../lib/prisma";
import { convertCreatedAtArray } from "../utils/date";

class ExamController {
	/**
	 * POST /api/crawl
	 * URL에서 크롤링 후 저장
	 */
	async crawlAndSave(req: Request, res: Response) {
		try {
			const { url, forceRetry } = req.body;

			if (!url) {
				return res.status(400).json({ error: "URL이 필요합니다" });
			}

			const result = await questionService.saveExamFromUrl(url, forceRetry || false);

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
	 * POST /api/crawl/batch
	 * 여러 URL을 순차적으로 크롤링 후 저장
	 */
	async crawlBatch(req: Request, res: Response) {
		try {
			const { urls, forceRetry } = req.body;

			if (!urls || !Array.isArray(urls) || urls.length === 0) {
				return res.status(400).json({ error: "URLs 배열이 필요합니다" });
			}

			const results = [];
			const errors = [];

			// 순차 처리 (동시 트랜잭션 충돌 방지)
			for (let i = 0; i < urls.length; i++) {
				const url = urls[i];
				try {
					console.log(`\n[${i + 1}/${urls.length}] 크롤링 시작: ${url}`);
					const result = await questionService.saveExamFromUrl(url, forceRetry || false);
					results.push({
						url,
						success: true,
						data: result,
					});
					console.log(`[${i + 1}/${urls.length}] ✅ 성공: ${result.title}`);
				} catch (error: any) {
					console.error(`[${i + 1}/${urls.length}] ❌ 실패: ${error.message}`);
					errors.push({
						url,
						success: false,
						error: error.message,
					});
				}
			}

			return res.json({
				success: true,
				data: {
					total: urls.length,
					successful: results.length,
					failed: errors.length,
					results,
					errors,
				},
			});
		} catch (error: any) {
			console.error("배치 크롤링 에러:", error);
			return res.status(500).json({
				error: "배치 크롤링 실패",
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

		// 채점 (answers의 키는 questionNumber를 사용)
		let correctCount = 0;
		const results = exam.questions.map((q) => {
			// 프론트엔드는 questionNumber(1, 2, 3...)를 키로 사용
			const rawUserAnswer = (answers as Record<string, unknown>)[String(q.questionNumber)];
			const userAnswer =
				rawUserAnswer === null || rawUserAnswer === undefined
					? undefined
					: typeof rawUserAnswer === "number"
						? rawUserAnswer
						: parseInt(String(rawUserAnswer), 10);

			const isCorrect = Number.isFinite(userAnswer) && userAnswer === q.correctAnswer;

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
