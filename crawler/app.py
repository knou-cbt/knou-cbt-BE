import requests
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Optional

class AllaClassCrawler:
    """올에이클래스 시험문제 크롤러"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def crawl_exam(self, url: str) -> Dict:
        """시험 페이지 전체 크롤링"""
        response = requests.get(url, headers=self.headers)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.content, 'html.parser')
        
        metadata = self._extract_metadata(soup)
        questions = self._extract_questions_from_structure(soup)
        answers = self._extract_answers(soup)
        
        # 정답 매칭
        if answers:
            for i, q in enumerate(questions):
                if i < len(answers):
                    q['correct_answer'] = int(answers[i])
        
        return {
            'metadata': metadata,
            'questions': questions
        }
    
    def _extract_metadata(self, soup: BeautifulSoup) -> Dict:
        """시험 메타데이터 추출"""
        metadata = {}
        
        # 페이지 상단의 메타데이터 테이블 찾기
        tables = soup.find_all('table')
        
        for table in tables:
            text = table.get_text()
            
            # 메타데이터 테이블인지 확인
            if '학년도' in text and '학기' in text:
                # 년도
                year_match = re.search(r'(\d{4})\s*학년도', text)
                if year_match:
                    metadata['year'] = year_match.group(1)
                
                # 학기
                semester_match = re.search(r'(\S+)\s*학기', text)
                if semester_match:
                    metadata['semester'] = semester_match.group(1)
                
                # 학년
                grade_match = re.search(r'(\d+|N)\s*학년', text)
                if grade_match:
                    metadata['grade'] = grade_match.group(1)
                
                # 문항수
                items_match = re.search(r'(\d+)\s*문항', text)
                if items_match:
                    metadata['total_questions'] = int(items_match.group(1))
                
                # 과목명 찾기
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    for cell in cells:
                        cell_text = cell.get_text(strip=True)
                        # "사회복지학개론" 같은 과목명 패턴
                        if re.search(r'\S+학(개론)?$', cell_text) and len(cell_text) < 30:
                            metadata['subject'] = cell_text
                
                break
        
        return metadata
    
    def _extract_questions_from_structure(self, soup: BeautifulSoup) -> List[Dict]:
        """
        HTML 구조를 이용한 문제 추출
        - alla6QuestionTr: 문제
        - alla6AnswerTr: 선택지
        - alla6SolveTr: 해설
        """
        questions = []
        
        # alla6QuestionTr 클래스를 가진 모든 행 찾기
        question_rows = soup.find_all('tr', class_='alla6QuestionTr')
        
        for q_row in question_rows:
            # 문제 번호와 텍스트 추출
            td = q_row.find('td')
            if not td:
                continue
            
            # 문제 번호 span 찾기
            q_num_span = td.find('span', class_='alla6QuestionNo')
            if not q_num_span:
                continue
            
            question_num = int(q_num_span.get_text(strip=True))
            
            # 문제 텍스트 (span 제거 후)
            q_num_span.extract()  # span 제거
            question_text = td.get_text(strip=True)
            
            # 이미지 찾기
            images = []
            img_tags = td.find_all('img')
            for img in img_tags:
                img_url = img.get('src')
                if img_url:
                    images.append(img_url)
            
            # 문제 객체 생성
            question = {
                'number': question_num,
                'question_text': question_text,
                'choices': [],
                'images': images
            }
            
            # 다음 형제 행들에서 선택지와 해설 찾기
            current_row = q_row.find_next_sibling('tr')
            
            while current_row:
                # 선택지 행
                if 'alla6AnswerTr' in current_row.get('class', []):
                    label = current_row.find('label')
                    if label:
                        # input 태그의 value로 선택지 번호 확인
                        input_tag = label.find('input')
                        choice_num = None
                        if input_tag:
                            choice_num = input_tag.get('value')
                        
                        # 선택지 텍스트 (input 제거 후)
                        if input_tag:
                            input_tag.extract()
                        
                        choice_text = label.get_text(strip=True)
                        
                        question['choices'].append({
                            'number': int(choice_num) if choice_num else len(question['choices']) + 1,
                            'text': choice_text
                        })
                
                # 해설 행
                elif 'alla6SolveTr' in current_row.get('class', []):
                    solve_td = current_row.find('td')
                    if solve_td:
                        explanation = solve_td.get_text(strip=True).replace('해설)', '').strip()
                        if explanation:
                            question['explanation'] = explanation
                    break  # 해설이 나오면 이 문제 종료
                
                # 다음 문제 시작
                elif 'alla6QuestionTr' in current_row.get('class', []):
                    break
                
                current_row = current_row.find_next_sibling('tr')
            
            questions.append(question)
        
        return questions
    
    def _extract_answers(self, soup: BeautifulSoup) -> Optional[List[int]]:
        """정답표 추출"""
        tables = soup.find_all('table')
        
        for table in tables:
            text = table.get_text()
            if '문제답안' in text:
                # 긴 숫자 문자열 찾기
                answer_match = re.search(r'(\d{30,})', text)
                if answer_match:
                    answer_string = answer_match.group(1)
                    return [int(d) for d in answer_string]
        
        return None


# 테스트 코드
if __name__ == '__main__':
    crawler = AllaClassCrawler()
    
    url = "https://allaclass.tistory.com/3733"
    result = crawler.crawl_exam(url)
    
    print("=== 메타데이터 ===")
    for key, value in result['metadata'].items():
        print(f"{key}: {value}")
    print()
    
    print(f"=== 추출된 문제 수: {len(result['questions'])} ===")
    print()
    
    # 처음 3문제만 자세히 출력
    for q in result['questions'][:3]:
        print(f"\n{'='*80}")
        print(f"📝 문제 {q['number']}")
        print(f"{'='*80}")
        print(f"질문: {q['question_text']}")
        print(f"\n선택지 ({len(q['choices'])}개):")
        for choice in q['choices']:
            marker = "✅" if 'correct_answer' in q and choice['number'] == q['correct_answer'] else "  "
            print(f"{marker} {choice['number']}. {choice['text']}")
        
        if 'correct_answer' in q:
            print(f"\n정답: {q['correct_answer']}번")
        
        if q.get('explanation'):
            print(f"💡 해설: {q['explanation']}")
        
        if q.get('images'):
            print(f"🖼️ 이미지: {len(q['images'])}개")
            for img_url in q['images']:
                print(f"   - {img_url}")
    
    # 통계
    total = len(result['questions'])
    with_choices = sum(1 for q in result['questions'] if len(q['choices']) >= 4)
    with_answers = sum(1 for q in result['questions'] if 'correct_answer' in q)
    with_explanations = sum(1 for q in result['questions'] if q.get('explanation'))
    
    print(f"\n{'='*80}")
    print("📊 통계")
    print(f"{'='*80}")
    print(f"전체 문제: {total}개")
    print(f"선택지 4개 이상: {with_choices}개 ({with_choices/total*100:.1f}%)")
    print(f"정답 있는 문제: {with_answers}개 ({with_answers/total*100:.1f}%)")
    print(f"해설 있는 문제: {with_explanations}개 ({with_explanations/total*100:.1f}%)")
    
    # 선택지 개수 분포
    choice_counts = {}
    for q in result['questions']:
        count = len(q['choices'])
        choice_counts[count] = choice_counts.get(count, 0) + 1
    
    print(f"\n선택지 개수 분포:")
    for count in sorted(choice_counts.keys()):
        print(f"  {count}개: {choice_counts[count]}문제")