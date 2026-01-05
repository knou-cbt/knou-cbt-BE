// src/services/questionService.ts
import prisma from "../lib/prisma";
import crawlerService from "./crawlerService";
import { convertCreatedAt, convertCreatedAtArray } from "../utils/date";

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
	 * @param url 크롤링할 URL
	 * @param forceRetry 부분적으로 저장된 데이터가 있어도 삭제하고 다시 시도할지 여부
	 */
	async saveExamFromUrl(url: string, forceRetry: boolean = false): Promise<SaveExamResult> {
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

		// 3. Exam 메타데이터 준비
		const year = parseInt(metadata.year || "2024");
		const semester = metadata.semester || "하계";
		const examType = this.getExamType(semester);

		let title = `${subjectName} ${year}학년도 ${semester}학기`;
		if (metadata.grade) {
			title += ` (${metadata.grade}학년)`;
		}

		// 4. 트랜잭션으로 전체 저장 (중간에 실패하면 롤백)
		const result = await prisma.$transaction(async (tx) => {
			// 트랜잭션 내에서 중복 체크
			const existingExam = await tx.exam.findFirst({
				where: {
					subjectId: subject.id,
					year,
					examType,
				},
				include: {
					questions: true,
				},
			});

			if (existingExam) {
				// 부분적으로 저장된 경우 (문제 수가 맞지 않으면)
				const isPartial = existingExam.questions.length !== questions.length;
				
				if (isPartial && forceRetry) {
					console.log(`⚠️ 부분적으로 저장된 시험 발견 (ID: ${existingExam.id}). 삭제 후 다시 시도합니다...`);
					// Cascade로 인해 Exam 삭제 시 Questions와 Choices도 자동 삭제됨
					await tx.exam.delete({
						where: { id: existingExam.id },
					});
					console.log(`✅ 기존 데이터 삭제 완료. 다시 시도합니다...`);
				} else if (isPartial) {
					throw new Error(
						`부분적으로 저장된 시험이 있습니다: ${existingExam.title} (ID: ${existingExam.id}, 저장된 문제: ${existingExam.questions.length}/${questions.length})\n` +
						`다시 시도하려면 forceRetry 옵션을 사용하세요.`
					);
				} else {
					throw new Error(
						`이미 존재하는 시험입니다: ${existingExam.title} (ID: ${existingExam.id})`
					);
				}
			}

			// Exam 생성
			const exam = await tx.exam.create({
				data: {
					subjectId: subject.id,
					year,
					examType,
					title,
					totalQuestions: questions.length,
				},
			});

			console.log(`✅ Exam 생성: ${title} (ID: ${exam.id})`);

			// 모든 Questions를 배치로 생성
			const createdQuestions = await Promise.all(
				questions.map((qData) =>
					tx.question.create({
						data: {
							examId: exam.id,
							questionNumber: qData.number,
							questionText: qData.questionText,
							questionImageUrl: qData.images[0] || null,
							correctAnswer: qData.correctAnswer ?? 1,
						},
					})
				)
			);

			console.log(`✅ Questions 저장 완료: ${createdQuestions.length}문제`);

			// 모든 Choices를 한 번에 배치로 생성
			const allChoices = createdQuestions.flatMap((question, idx) => {
				const qData = questions[idx];
				return qData.choices.map((choice) => ({
					questionId: question.id,
					choiceNumber: choice.number,
					choiceText: choice.text,
				}));
			});

			await tx.choice.createMany({
				data: allChoices,
			});

			console.log(`✅ Choices 저장 완료: ${allChoices.length}개`);

			return {
				examId: exam.id,
				title: exam.title,
				questionCount: questions.length,
			};
		}, {
			maxWait: 10000, // 트랜잭션 획득 대기 시간 10초
			timeout: 60000, // 트랜잭션 실행 타임아웃 60초
		});

		return result;
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
