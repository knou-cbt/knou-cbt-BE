// src/controllers/subjectController.ts
import { Request, Response } from "express";
import prisma from "../lib/prisma";

class SubjectController {
	/**
	 * GET /api/subjects
	 * 과목 전체 목록 조회 (검색 + 페이지네이션)
	 */
	async getSubjects(req: Request, res: Response) {
		try {
			const { search, page = "1", limit = "10" } = req.query;

			const pageNum = parseInt(page as string);
			const limitNum = parseInt(limit as string);
			const skip = (pageNum - 1) * limitNum;

			// 검색 조건
			const where = search
				? {
						name: {
							contains: search as string,
						},
				  }
				: {};

			// 전체 개수
			const total = await prisma.subject.count({ where });

			// 과목 목록
			const subjects = await prisma.subject.findMany({
				where,
				include: {
					_count: {
						select: { exams: true },
					},
				},
				orderBy: {
					name: "asc",
				},
				skip,
				take: limitNum,
			});

			return res.json({
				success: true,
				data: {
					subjects: subjects.map((s) => ({
						id: s.id,
						name: s.name,
						examCount: s._count.exams,
						createdAt: s.createdAt,
					})),
					pagination: {
						page: pageNum,
						limit: limitNum,
						total,
						totalPages: Math.ceil(total / limitNum),
					},
				},
			});
		} catch (error: any) {
			console.error("과목 목록 조회 에러:", error);
			return res.status(500).json({
				error: "과목 목록 조회 실패",
				message: error.message,
			});
		}
	}

	/**
	 * GET /api/subjects/:id
	 * 특정 과목의 상세 정보 조회
	 */
	async getSubjectById(req: Request, res: Response) {
		try {
			const subjectId = parseInt(req.params.id);

			const subject = await prisma.subject.findUnique({
				where: { id: subjectId },
				include: {
					_count: {
						select: { exams: true },
					},
					exams: {
						select: {
							id: true,
							title: true,
							year: true,
							examType: true,
							totalQuestions: true,
							createdAt: true,
						},
						orderBy: {
							year: "desc",
						},
					},
				},
			});

			if (!subject) {
				return res.status(404).json({
					error: "과목을 찾을 수 없습니다",
				});
			}

			return res.json({
				success: true,
				data: {
					id: subject.id,
					name: subject.name,
					examCount: subject._count.exams,
					exams: subject.exams,
					createdAt: subject.createdAt,
				},
			});
		} catch (error: any) {
			console.error("과목 조회 에러:", error);
			return res.status(500).json({
				error: "과목 조회 실패",
				message: error.message,
			});
		}
	}

	/**
	 * GET /api/subjects/:subjectId/exams
	 * 특정 과목의 시험지 목록 조회
	 */
	async getExamsBySubject(req: Request, res: Response) {
		try {
			const subjectId = parseInt(req.params.subjectId);

			const exams = await prisma.exam.findMany({
				where: { subjectId },
				include: {
					subject: true,
				},
				orderBy: {
					year: "desc",
				},
			});

			return res.json({
				success: true,
				data: exams,
			});
		} catch (error: any) {
			console.error("시험 목록 조회 에러:", error);
			return res.status(500).json({
				error: "시험 목록 조회 실패",
				message: error.message,
			});
		}
	}
}

export default new SubjectController();
