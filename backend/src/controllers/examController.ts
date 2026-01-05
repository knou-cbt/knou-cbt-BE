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
			const { answers } = req.body; // [{questionId, selectedAnswer}]

			if (!answers || !Array.isArray(answers)) {
				return res.status(400).json({
					error: "답안이 필요합니다 (배열 형식)",
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

		// 답안을 Map으로 변환 (빠른 조회)
		const answerMap = new Map<number, number>();
		console.log("📝 받은 답안:", JSON.stringify(answers, null, 2));
		
		answers.forEach((answer: any) => {
			if (answer.questionId !== undefined && answer.selectedAnswer !== undefined) {
				// questionId를 명시적으로 숫자로 변환
				const questionId = typeof answer.questionId === "number"
					? answer.questionId
					: parseInt(String(answer.questionId), 10);
				
				const selectedAnswer = typeof answer.selectedAnswer === "number"
					? answer.selectedAnswer
					: parseInt(String(answer.selectedAnswer), 10);
				
				if (Number.isFinite(questionId) && Number.isFinite(selectedAnswer)) {
					answerMap.set(questionId, selectedAnswer);
					console.log(`✅ Map에 저장: questionId=${questionId}, selectedAnswer=${selectedAnswer}`);
				} else {
					console.log(`❌ 숫자 변환 실패: questionId=${questionId}, selectedAnswer=${selectedAnswer}`);
				}
			} else {
				console.log(`❌ 필드 누락:`, answer);
			}
		});
		
		console.log("🗺️ 최종 answerMap:", Array.from(answerMap.entries()));

		// 채점
		let correctCount = 0;
		const results = exam.questions.map((q) => {
			const userAnswer = answerMap.get(q.id);
			const isCorrect = userAnswer !== undefined && userAnswer === q.correctAnswer;

			if (isCorrect) correctCount++;

			return {
				questionId: q.id,
				questionNumber: q.questionNumber,
				userAnswer: userAnswer ?? null,
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
