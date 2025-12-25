// src/services/crawlerService.ts
import axios from "axios";
import * as cheerio from "cheerio";

type CheerioRoot = ReturnType<typeof cheerio.load>;

interface CrawlMetadata {
	subject?: string;
	year?: string;
	semester?: string;
	grade?: string;
	totalQuestions?: number;
}

interface Choice {
	number: number;
	text: string;
}

interface Question {
	number: number;
	questionText: string;
	choices: Choice[];
	images: string[];
	correctAnswer?: number;
	explanation?: string;
}

interface CrawlResult {
	metadata: CrawlMetadata;
	questions: Question[];
}

class CrawlerService {
	/**
	 * 올에이클래스 시험 페이지 크롤링
	 */
	async crawlExam(url: string): Promise<CrawlResult> {
		try {
			// HTML 가져오기
		const response = await axios.get(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			},
		});

		const $ = cheerio.load(response.data);

			// 메타데이터 추출
			const metadata = this.extractMetadata($);

			// 문제 추출
			const questions = this.extractQuestions($);

			// 정답 추출
			const answers = this.extractAnswers($);

			// 정답 매칭
			if (answers) {
				questions.forEach((q, idx) => {
					if (idx < answers.length) {
						q.correctAnswer = answers[idx];
					}
				});
			}

			return { metadata, questions };
		} catch (error) {
			console.error("크롤링 에러:", error);
			throw new Error("크롤링 실패");
		}
	}

	/**
	 * 메타데이터 추출
	 */
	private extractMetadata($: CheerioRoot): CrawlMetadata {
		const metadata: CrawlMetadata = {};

		// 첫 번째 테이블에서 메타데이터 추출
		const firstTable = $("table").first();
		const text = firstTable.text();

		// 년도
		const yearMatch = text.match(/(\d{4})\s*학년도/);
		if (yearMatch) metadata.year = yearMatch[1];

		// 학기
		const semesterMatch = text.match(/(\S+)\s*학기/);
		if (semesterMatch) metadata.semester = semesterMatch[1];

		// 학년
		const gradeMatch = text.match(/(\d+|N)\s*학년/);
		if (gradeMatch) metadata.grade = gradeMatch[1];

		// 문항수
		const itemsMatch = text.match(/(\d+)\s*문항/);
		if (itemsMatch) metadata.totalQuestions = parseInt(itemsMatch[1]);

		// 과목명
		firstTable.find("tr").each((_, row) => {
			$(row)
				.find("td")
				.each((_, cell) => {
					const cellText = $(cell).text().trim();
					if (/\S+학(개론)?$/.test(cellText) && cellText.length < 30) {
						metadata.subject = cellText;
					}
				});
		});

		return metadata;
	}

	/**
	 * 문제 추출
	 */
	private extractQuestions($: CheerioRoot): Question[] {
		const questions: Question[] = [];

		// alla6QuestionTr 클래스를 가진 모든 행 찾기
		$(".alla6QuestionTr").each((_, qRow) => {
			const $td = $(qRow).find("td").first();
			if (!$td.length) return;

			// 문제 번호
			const qNumSpan = $td.find(".alla6QuestionNo");
			if (!qNumSpan.length) return;

			const questionNum = parseInt(qNumSpan.text().trim());

			// 문제 텍스트
			qNumSpan.remove();
			const questionText = $td.text().trim();

			// 이미지
			const images: string[] = [];
			$td.find("img").each((_, img) => {
				const src = $(img).attr("src");
				if (src) images.push(src);
			});

			// 문제 객체 생성
			const question: Question = {
				number: questionNum,
				questionText,
				choices: [],
				images,
			};

			// 선택지 찾기 (다음 형제 행들)
			let currentRow = $(qRow).next();

			while (currentRow.length) {
				// 선택지 행
				if (currentRow.hasClass("alla6AnswerTr")) {
					const label = currentRow.find("label").first();
					if (label.length) {
						const input = label.find("input").first();
						const choiceNum = input.attr("value");

						input.remove();
						const choiceText = label.text().trim();

						question.choices.push({
							number: choiceNum ? parseInt(choiceNum) : question.choices.length + 1,
							text: choiceText,
						});
					}
				}
				// 해설 행
				else if (currentRow.hasClass("alla6SolveTr")) {
					const solveTd = currentRow.find("td").first();
					const explanation = solveTd.text().trim().replace("해설)", "").trim();
					if (explanation) {
						question.explanation = explanation;
					}
					break;
				}
				// 다음 문제 시작
				else if (currentRow.hasClass("alla6QuestionTr")) {
					break;
				}

				currentRow = currentRow.next();
			}

			questions.push(question);
		});

		return questions;
	}

	/**
	 * 정답표 추출
	 */
	private extractAnswers($: CheerioRoot): number[] | null {
		let answers: number[] | null = null;

		$("table").each((_, table) => {
			const text = $(table).text();
			if (text.includes("문제답안")) {
				const answerMatch = text.match(/(\d{30,})/);
				if (answerMatch) {
					const answerString = answerMatch[1];
					answers = answerString.split("").map((d) => parseInt(d));
					return false; // break
				}
			}
		});

		return answers;
	}
}

export default new CrawlerService();
