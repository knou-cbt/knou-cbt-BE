// src/controllers/__tests__/examController.submitExam.test.ts
import { Request, Response } from "express";
import examController from "../examController";
import prisma from "../../lib/prisma";

// Prisma를 모킹
jest.mock("../../lib/prisma", () => ({
	__esModule: true,
	default: {
		exam: {
			findUnique: jest.fn(),
		},
	},
}));

describe("ExamController.submitExam", () => {
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let jsonMock: jest.Mock;
	let statusMock: jest.Mock;

	beforeEach(() => {
		jsonMock = jest.fn();
		statusMock = jest.fn().mockReturnThis();
		mockResponse = {
			json: jsonMock,
			status: statusMock,
		};
		jest.clearAllMocks();
	});

	it("should correctly grade answers with new array format", async () => {
		// Mock DB response
		const mockExam = {
			id: 20,
			questions: [
				{ id: 722, questionNumber: 1, correctAnswer: 1 },
				{ id: 723, questionNumber: 2, correctAnswer: 2 },
				{ id: 724, questionNumber: 3, correctAnswer: 3 },
			],
		};

		(prisma.exam.findUnique as jest.Mock).mockResolvedValue(mockExam);

		// 새로운 배열 형식
		mockRequest = {
			params: { id: "20" },
			body: {
				answers: [
					{ questionId: 722, selectedAnswer: 1 }, // 정답
					{ questionId: 723, selectedAnswer: 3 }, // 오답
					{ questionId: 724, selectedAnswer: 3 }, // 정답
				],
			},
		};

		await examController.submitExam(
			mockRequest as Request,
			mockResponse as Response
		);

		expect(jsonMock).toHaveBeenCalledWith({
			success: true,
			data: expect.objectContaining({
				examId: 20,
				totalQuestions: 3,
				correctCount: 2, // 1번, 3번 정답
				score: 67,
				results: [
					{
						questionId: 722,
						questionNumber: 1,
						userAnswer: 1,
						correctAnswer: 1,
						isCorrect: true,
					},
					{
						questionId: 723,
						questionNumber: 2,
						userAnswer: 3,
						correctAnswer: 2,
						isCorrect: false,
					},
					{
						questionId: 724,
						questionNumber: 3,
						userAnswer: 3,
						correctAnswer: 3,
						isCorrect: true,
					},
				],
			}),
		});
	});

	it("should handle string selectedAnswer (convert to number)", async () => {
		const mockExam = {
			id: 1,
			questions: [
				{ id: 100, questionNumber: 1, correctAnswer: 2 },
				{ id: 101, questionNumber: 2, correctAnswer: 4 },
			],
		};

		(prisma.exam.findUnique as jest.Mock).mockResolvedValue(mockExam);

		mockRequest = {
			params: { id: "1" },
			body: {
				answers: [
					{ questionId: 100, selectedAnswer: "2" }, // 문자열
					{ questionId: 101, selectedAnswer: 4 },   // 숫자
				],
			},
		};

		await examController.submitExam(
			mockRequest as Request,
			mockResponse as Response
		);

		expect(jsonMock).toHaveBeenCalledWith({
			success: true,
			data: expect.objectContaining({
				correctCount: 2,
				score: 100,
				results: expect.arrayContaining([
					expect.objectContaining({
						questionId: 100,
						userAnswer: 2, // 문자열 "2"가 숫자 2로 변환됨
						correctAnswer: 2,
						isCorrect: true,
					}),
					expect.objectContaining({
						questionId: 101,
						userAnswer: 4,
						correctAnswer: 4,
						isCorrect: true,
					}),
				]),
			}),
		});
	});

	it("should return 400 when answers is not an array", async () => {
		mockRequest = {
			params: { id: "1" },
			body: {
				answers: { "1": 2 }, // 객체 형식 (잘못된 형식)
			},
		};

		await examController.submitExam(
			mockRequest as Request,
			mockResponse as Response
		);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			error: "답안이 필요합니다 (배열 형식)",
		});
	});

	it("should return 404 when exam not found", async () => {
		(prisma.exam.findUnique as jest.Mock).mockResolvedValue(null);

		mockRequest = {
			params: { id: "999" },
			body: {
				answers: [{ questionId: 1, selectedAnswer: 1 }],
			},
		};

		await examController.submitExam(
			mockRequest as Request,
			mockResponse as Response
		);

		expect(statusMock).toHaveBeenCalledWith(404);
		expect(jsonMock).toHaveBeenCalledWith({
			error: "시험을 찾을 수 없습니다",
		});
	});

	it("should handle missing answers for some questions (treat as incorrect)", async () => {
		const mockExam = {
			id: 1,
			questions: [
				{ id: 100, questionNumber: 1, correctAnswer: 1 },
				{ id: 101, questionNumber: 2, correctAnswer: 2 },
				{ id: 102, questionNumber: 3, correctAnswer: 3 },
			],
		};

		(prisma.exam.findUnique as jest.Mock).mockResolvedValue(mockExam);

		// 2번 문제 답을 안 보냄
		mockRequest = {
			params: { id: "1" },
			body: {
				answers: [
					{ questionId: 100, selectedAnswer: 1 },
					{ questionId: 102, selectedAnswer: 3 },
					// questionId 101 누락
				],
			},
		};

		await examController.submitExam(
			mockRequest as Request,
			mockResponse as Response
		);

		expect(jsonMock).toHaveBeenCalledWith({
			success: true,
			data: expect.objectContaining({
				correctCount: 2,
				score: 67, // 2/3 * 100 = 66.666... → 67
				results: expect.arrayContaining([
					expect.objectContaining({
						questionId: 101,
						userAnswer: null,
						correctAnswer: 2,
						isCorrect: false,
					}),
				]),
			}),
		});
	});

	it("should handle empty answers array", async () => {
		const mockExam = {
			id: 1,
			questions: [
				{ id: 100, questionNumber: 1, correctAnswer: 1 },
				{ id: 101, questionNumber: 2, correctAnswer: 2 },
			],
		};

		(prisma.exam.findUnique as jest.Mock).mockResolvedValue(mockExam);

		mockRequest = {
			params: { id: "1" },
			body: {
				answers: [], // 빈 배열
			},
		};

		await examController.submitExam(
			mockRequest as Request,
			mockResponse as Response
		);

		expect(jsonMock).toHaveBeenCalledWith({
			success: true,
			data: expect.objectContaining({
				correctCount: 0,
				score: 0,
				results: [
					{
						questionId: 100,
						questionNumber: 1,
						userAnswer: null,
						correctAnswer: 1,
						isCorrect: false,
					},
					{
						questionId: 101,
						questionNumber: 2,
						userAnswer: null,
						correctAnswer: 2,
						isCorrect: false,
					},
				],
			}),
		});
	});
});
