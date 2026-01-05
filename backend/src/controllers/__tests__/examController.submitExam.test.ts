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

	it("should correctly grade answers when keys are questionNumbers (not questionIds)", async () => {
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

		// 프론트엔드가 보내는 형식: questionNumber를 키로 사용
		mockRequest = {
			params: { id: "20" },
			body: {
				answers: {
					"1": 1, // 1번 문제 → 정답 1
					"2": 3, // 2번 문제 → 오답 (정답은 2)
					"3": 3, // 3번 문제 → 정답 3
				},
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

	it("should handle string answers (from JSON) correctly", async () => {
		const mockExam = {
			id: 1,
			questions: [
				{ id: 100, questionNumber: 1, correctAnswer: 2 },
				{ id: 101, questionNumber: 2, correctAnswer: 4 },
			],
		};

		(prisma.exam.findUnique as jest.Mock).mockResolvedValue(mockExam);

		// JSON에서 파싱되면 숫자로 오지만, 일부 클라이언트는 문자열로 보낼 수 있음
		mockRequest = {
			params: { id: "1" },
			body: {
				answers: {
					"1": "2", // 문자열 "2"
					"2": 4,   // 숫자 4
				},
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
						questionNumber: 1,
						userAnswer: 2, // 문자열 "2"가 숫자 2로 변환됨
						correctAnswer: 2,
						isCorrect: true,
					}),
					expect.objectContaining({
						questionNumber: 2,
						userAnswer: 4,
						correctAnswer: 4,
						isCorrect: true,
					}),
				]),
			}),
		});
	});

	it("should return 400 when answers are missing", async () => {
		mockRequest = {
			params: { id: "1" },
			body: {},
		};

		await examController.submitExam(
			mockRequest as Request,
			mockResponse as Response
		);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			error: "답안이 필요합니다",
		});
	});

	it("should return 404 when exam not found", async () => {
		(prisma.exam.findUnique as jest.Mock).mockResolvedValue(null);

		mockRequest = {
			params: { id: "999" },
			body: {
				answers: { "1": 1 },
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
				answers: {
					"1": 1,
					"3": 3,
					// "2"는 누락
				},
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
						questionNumber: 2,
						userAnswer: undefined,
						correctAnswer: 2,
						isCorrect: false,
					}),
				]),
			}),
		});
	});
});
