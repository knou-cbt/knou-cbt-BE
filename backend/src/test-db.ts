// src/test-db.ts
import prisma from "./lib/prisma";

async function main() {
	// Subject 생성
	const subject = await prisma.subject.create({
		data: {
			name: "사회복지학개론",
		},
	});

	console.log("✅ Subject 생성:", subject);

	// Exam 생성
	const exam = await prisma.exam.create({
		data: {
			subjectId: subject.id,
			year: 2018,
			examType: 4, // 동계
			title: "사회복지학개론 2018학년도 동계학기",
			totalQuestions: 50,
		},
	});

	console.log("✅ Exam 생성:", exam);

	// 조회
	const allSubjects = await prisma.subject.findMany({
		include: { exams: true },
	});

	console.log("✅ 전체 과목:", JSON.stringify(allSubjects, null, 2));
}

main()
	.catch((e) => {
		console.error("❌ 에러:", e);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
