// src/services/questionService.ts
import prisma from "../lib/prisma";
import crawlerService from "./crawlerService";

interface SaveExamResult {
	examId: number;
	title: string;
	questionCount: number;
}

class QuestionService {
	/**
	 * 학기 문자열을 exam_type 숫자로 변환
	 * 1: 1학기기말, 2: 2학기기말, 3: 하계, 4: 동계
	 */
	private getExamType(semester: string): number {
		const semesterMap: Record<string, number> = {
			하계: 3,
			동계: 4,
			"1학기": 1,
			"2학기": 2,
		};

		for (const [key, value] of Object.entries(semesterMap)) {
			if (semester.includes(key)) {
				return value;
			}
		}

		return 3; // 기본값: 하계
	}

	/**
	 * URL에서 크롤링 후 DB에 저장
	 */
	async saveExamFromUrl(url: string): Promise<SaveExamResult> {
		// 1. 크롤링
		const crawlResult = await crawlerService.crawlExam(url);
		const { metadata, questions } = crawlResult;

		// 2. Subject 생성/조회
		const subjectName = metadata.subject || "과목명미상";
		const subject = await prisma.subject.upsert({
			where: { name: subjectName },
			create: { name: subjectName },
			update: {},
		});

		// 3. Exam 생성
		const year = parseInt(metadata.year || "2024");
		const semester = metadata.semester || "하계";
		const examType = this.getExamType(semester);

		let title = `${subjectName} ${year}학년도 ${semester}학기`;
		if (metadata.grade) {
			title += ` (${metadata.grade}학년)`;
		}

		const exam = await prisma.exam.create({
			data: {
				subjectId: subject.id,
				year,
				examType,
				title,
				totalQuestions: questions.length,
			},
		});

		console.log(`✅ Exam 생성: ${title} (ID: ${exam.id})`);

		// 4. Questions & Choices 생성
		for (const qData of questions) {
			const question = await prisma.question.create({
				data: {
					examId: exam.id,
					questionNumber: qData.number,
					questionText: qData.questionText,
					questionImageUrl: qData.images[0] || null,
					correctAnswer: qData.correctAnswer || 1,
				},
			});

			// Choices 생성
			for (const choice of qData.choices) {
				await prisma.choice.create({
					data: {
						questionId: question.id,
						choiceNumber: choice.number,
						choiceText: choice.text,
					},
				});
			}
		}

		console.log(`✅ 저장 완료: ${questions.length}문제`);

		return {
			examId: exam.id,
			title: exam.title,
			questionCount: questions.length,
		};
	}

	/**
	 * 시험 목록 조회
	 */
	async getExams(subjectName?: string) {
		return await prisma.exam.findMany({
			where: subjectName
				? {
						subject: {
							name: {
								contains: subjectName,
							},
						},
				  }
				: undefined,
			include: {
				subject: true,
			},
			orderBy: {
				createdAt: "desc",
			},
		});
	}

	/**
	 * 특정 시험의 문제 조회 (CBT용)
	 * 프론트엔드에서 사용하기 편한 형태로 변환
	 */
	async getExamQuestions(examId: number, includeAnswers: boolean = false) {
		const exam = await prisma.exam.findUnique({
			where: { id: examId },
			include: {
				subject: true,
				questions: {
					include: {
						choices: {
							orderBy: {
								choiceNumber: "asc",
							},
						},
					},
					orderBy: {
						questionNumber: "asc",
					},
				},
			},
		});

		if (!exam) {
			throw new Error("시험을 찾을 수 없습니다");
		}

		// 프론트엔드에서 사용하기 편한 형태로 변환
		const transformedQuestions = exam.questions.map((q) => {
			const choices = q.choices.map((choice) => ({
				number: choice.choiceNumber,
				text: choice.choiceText,
				imageUrl: choice.choiceImageUrl,
				// study 모드일 때만 isCorrect 추가
				...(includeAnswers && {
					isCorrect: choice.choiceNumber === q.correctAnswer,
				}),
			}));

			return {
				id: q.id,
				number: q.questionNumber,
				text: q.questionText,
				imageUrl: q.questionImageUrl,
				// study 모드일 때만 correctAnswer 포함
				...(includeAnswers && {
					correctAnswer: q.correctAnswer,
				}),
				choices,
			};
		});

		return {
			exam: {
				id: exam.id,
				title: exam.title,
				subject: exam.subject.name,
				totalQuestions: exam.totalQuestions,
			},
			questions: transformedQuestions,
		};
	}
}

export default new QuestionService();
