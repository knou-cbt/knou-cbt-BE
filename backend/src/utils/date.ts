// src/utils/date.ts

/**
 * UTC DateTime을 한국 시간(KST) 문자열로 변환
 * @param date UTC DateTime 또는 ISO 문자열
 * @returns 한국 시간 문자열 (YYYY-MM-DD HH:mm:ss)
 */
export function toKSTString(date: Date | string | null | undefined): string | null {
	if (!date) return null;

	const d = typeof date === "string" ? new Date(date) : date;
	
	// UTC 시간을 가져와서 한국 시간(UTC+9)으로 변환
	const utcTime = d.getTime();
	const kstTime = utcTime + 9 * 60 * 60 * 1000; // 9시간 추가
	const kstDate = new Date(kstTime);
	
	const year = kstDate.getUTCFullYear();
	const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
	const day = String(kstDate.getUTCDate()).padStart(2, "0");
	const hours = String(kstDate.getUTCHours()).padStart(2, "0");
	const minutes = String(kstDate.getUTCMinutes()).padStart(2, "0");
	const seconds = String(kstDate.getUTCSeconds()).padStart(2, "0");
	
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 객체의 createdAt 필드를 한국 시간으로 변환
 */
export function convertCreatedAt<T extends { createdAt: Date | string }>(
	obj: T
): Omit<T, "createdAt"> & { createdAt: string | null } {
	return {
		...obj,
		createdAt: toKSTString(obj.createdAt),
	};
}

/**
 * 배열의 모든 객체의 createdAt 필드를 한국 시간으로 변환
 */
export function convertCreatedAtArray<T extends { createdAt: Date | string }>(
	arr: T[]
): Array<Omit<T, "createdAt"> & { createdAt: string | null }> {
	return arr.map(convertCreatedAt);
}

