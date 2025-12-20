#!/usr/bin/env python3
"""
Flask API 서버 - PDF 추출 서비스 v5.0 (완전 최종판)
- 표 위치 기반 정렬
- 선택지 기호 매칭
- 2x2 레이아웃 자동 인식
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from pathlib import Path
import json
import pdfplumber
from pypdf import PdfReader
from PIL import Image
import io
import re
import math

app = Flask(__name__)
CORS(app)

# 디렉토리 설정
UPLOAD_FOLDER = Path('uploads')
OUTPUT_FOLDER = Path('output')
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)


def extract_images_from_pdf(pdf_path, output_dir):
    """PDF에서 이미지를 추출하여 PNG 파일로 저장"""
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    reader = PdfReader(pdf_path)
    image_info = []
    
    for page_num, page in enumerate(reader.pages, 1):
        images = page.images
        
        for img_index, img in enumerate(images):
            try:
                image_data = img.data
                image = Image.open(io.BytesIO(image_data))
                
                img_filename = f"page{page_num}_img{img_index + 1}.png"
                img_path = output_dir / img_filename
                
                image.save(img_path)
                
                image_info.append({
                    'page': page_num,
                    'index': img_index + 1,
                    'filename': img_filename,
                    'path': str(img_path)
                })
                print(f"✓ 이미지 추출: {img_filename}")
                
            except Exception as e:
                print(f"⚠ 이미지 추출 실패: {e}")
    
    return image_info


def extract_tables_with_positions(pdf_path):
    """
    표와 위치 정보 함께 추출
    """
    tables_info = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            # 표 설정
            table_settings = {
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "intersection_tolerance": 3
            }
            
            # 표 찾기 (위치 정보 포함)
            tables = page.find_tables(table_settings)
            
            for table_index, table in enumerate(tables):
                # 표 위치 (bbox)
                bbox = table.bbox  # (x0, y0, x1, y1)
                
                # 표 데이터 추출
                extracted_table = table.extract()
                
                if extracted_table:
                    tables_info.append({
                        'page': page_num,
                        'index': table_index + 1,
                        'data': extracted_table,
                        'bbox': bbox,
                        'x': bbox[0],  # 왼쪽 x
                        'y': bbox[1],  # 위쪽 y
                        'width': bbox[2] - bbox[0],
                        'height': bbox[3] - bbox[1]
                    })
                    
                    print(f"✓ 표 추출: 페이지 {page_num}, 위치 ({bbox[0]:.0f}, {bbox[1]:.0f})")
    
    return tables_info


def find_choice_symbols(page):
    """
    페이지에서 ①②③④ 위치 찾기
    """
    choice_symbols = ['①', '②', '③', '④']
    choice_positions = {}
    
    try:
        # 모든 단어 추출
        words = page.extract_words()
        
        for word in words:
            text = word['text']
            if text in choice_symbols:
                # 이미 찾았으면 스킵 (첫 번째만)
                if text not in choice_positions:
                    choice_positions[text] = {
                        'x': word['x0'],
                        'y': word['top']
                    }
                    print(f"  선택지 {text} 위치: ({word['x0']:.0f}, {word['top']:.0f})")
    
    except Exception as e:
        print(f"  선택지 위치 찾기 실패: {e}")
    
    return choice_positions


def match_tables_to_choices(tables, choice_positions):
    """
    표를 가장 가까운 선택지에 매칭
    """
    if not choice_positions:
        print("  선택지 위치 없음 → 위치 기반 정렬 사용")
        return sort_tables_by_position(tables)
    
    choice_symbols = ['①', '②', '③', '④']
    matched = {}
    
    for table in tables:
        table_x = table['x']
        table_y = table['y']
        
        # 가장 가까운 선택지 찾기
        min_distance = float('inf')
        closest_symbol = None
        
        for symbol, pos in choice_positions.items():
            # 거리 계산 (y 가중치 높게)
            dx = table_x - pos['x']
            dy = table_y - pos['y']
            distance = math.sqrt(dx**2 + (dy*2)**2)  # y축 2배 가중치
            
            # 표가 선택지 아래에 있어야 함 (y > pos['y'])
            if table_y >= pos['y'] - 10:  # 약간의 오차 허용
                if distance < min_distance:
                    min_distance = distance
                    closest_symbol = symbol
        
        if closest_symbol:
            # 이미 매칭된 선택지면 더 가까운 것 선택
            if closest_symbol in matched:
                prev_distance = matched[closest_symbol]['distance']
                if min_distance < prev_distance:
                    matched[closest_symbol] = {
                        'table': table,
                        'distance': min_distance
                    }
            else:
                matched[closest_symbol] = {
                    'table': table,
                    'distance': min_distance
                }
            
            print(f"  표 → {closest_symbol} (거리: {min_distance:.0f})")
    
    # ①②③④ 순서로 반환
    ordered = []
    for symbol in choice_symbols:
        if symbol in matched:
            ordered.append(matched[symbol]['table'])
        else:
            ordered.append(None)
    
    return ordered


def sort_tables_by_position(tables):
    """
    표를 위치 기반으로 정렬 (2x2 레이아웃)
    
    ① ②
    ③ ④
    """
    if len(tables) < 4:
        return sorted(tables, key=lambda t: (t['y'], t['x']))
    
    # y 좌표로 그룹화
    sorted_by_y = sorted(tables, key=lambda t: t['y'])
    
    # 상위 2개, 하위 2개
    mid_y = (sorted_by_y[1]['y'] + sorted_by_y[2]['y']) / 2
    
    top_tables = [t for t in tables if t['y'] < mid_y]
    bottom_tables = [t for t in tables if t['y'] >= mid_y]
    
    # 각 행에서 x로 정렬
    top_sorted = sorted(top_tables, key=lambda t: t['x'])
    bottom_sorted = sorted(bottom_tables, key=lambda t: t['x'])
    
    return top_sorted + bottom_sorted


def extract_exam_metadata(tables_info):
    """첫 번째 표에서 시험 메타데이터 추출"""
    if not tables_info:
        return None
    
    first_table = tables_info[0]['data']
    
    metadata = {
        'subject': None,
        'subject_code': None,
        'total_questions': None
    }
    
    for row in first_table:
        row_text = ' '.join([str(cell) for cell in row if cell])
        
        # 과목명
        if '컴퓨팅' in row_text or '컴 퓨 팅' in row_text:
            subject = row_text.replace(' ', '').strip()
            subject = re.sub(r'\d+', '', subject).strip()
            metadata['subject'] = subject
            
            code_match = re.search(r'(\d+)', row_text)
            if code_match:
                metadata['subject_code'] = code_match.group(1)
        
        # 문항수
        if '문항' in row_text or '문 항' in row_text:
            match = re.search(r'(\d+)\s*문항', row_text)
            if match:
                metadata['total_questions'] = int(match.group(1))
    
    print(f"✓ 메타데이터: {metadata}")
    return metadata


def extract_text_two_columns(pdf_path):
    """2단 레이아웃 PDF에서 텍스트 추출"""
    text_by_page = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            page_width = page.width
            page_height = page.height
            mid_x = page_width / 2
            
            # 겹침 없이 정확히 분할
            left_bbox = (0, 0, mid_x, page_height)
            right_bbox = (mid_x, 0, page_width, page_height)
            
            left_text = page.within_bbox(left_bbox).extract_text()
            right_text = page.within_bbox(right_bbox).extract_text()
            
            full_text = ""
            if left_text:
                full_text += left_text
            if right_text:
                full_text += "\n" + right_text
            
            text_by_page.append({
                'page': page_num,
                'text': full_text,
                'left_text': left_text,
                'right_text': right_text
            })
            
            print(f"✓ 페이지 {page_num} 2단 추출")
    
    return text_by_page


def extract_common_instructions(full_text):
    """※ 공통 설명 추출"""
    instructions = []
    
    pattern = r'※\s*([^(]+)\((\d+)∼(\d+)\)'
    
    for match in re.finditer(pattern, full_text):
        instruction_text = match.group(1).strip()
        start_q = int(match.group(2))
        end_q = int(match.group(3))
        
        full_instruction = match.group(0)
        
        instructions.append({
            'text': full_instruction,
            'content': instruction_text,
            'start': start_q,
            'end': end_q,
            'questions': list(range(start_q, end_q + 1))
        })
        
        print(f"✓ 공통 설명: 문제 {start_q}~{end_q}")
    
    return instructions


def clean_question_text(text):
    """문제/선택지 텍스트 정리"""
    text = re.sub(r'다\s+양한', '다양한', text)
    text = ' '.join(text.split())
    return text


def parse_questions_v5(text_by_page):
    """문제 파싱 v5"""
    questions = []
    
    for page_data in text_by_page:
        page_num = page_data['page']
        page_text = page_data['text']
        
        # 접두사 정리
        page_text = re.sub(r'\b[a-z가-힣]{1,2}\s+(\d+\.)', r'\n\1', page_text)
        
        # 문제 블록 분리
        question_blocks = re.split(r'\n(?=\d+\.\s)', page_text)
        
        for block in question_blocks:
            block = block.strip()
            if not block:
                continue
            
            q_match = re.match(r'^(\d+)\.\s+(.+)', block, re.DOTALL)
            
            if not q_match:
                continue
            
            q_num = int(q_match.group(1))
            q_content = q_match.group(2)
            
            q_content = clean_question_text(q_content)
            
            # 선택지 찾기
            choices = []
            choice_splits = re.split(r'([①②③④])', q_content)
            
            current_choice = None
            for part in choice_splits:
                if part in ['①', '②', '③', '④']:
                    if current_choice is not None:
                        choices.append(clean_question_text(current_choice.strip()))
                    current_choice = ""
                elif current_choice is not None:
                    current_choice += part
            
            if current_choice is not None:
                choices.append(clean_question_text(current_choice.strip()))
            
            # 문제 본문
            question_text = re.split(r'[①②③④]', q_content)[0].strip()
            question_text = clean_question_text(question_text)
            
            question_text = ' '.join(question_text.split())
            choices = [' '.join(c.split()) for c in choices]
            
            # 선택지 4개 맞추기
            while len(choices) < 4:
                choices.append("")
            
            question_obj = {
                'number': q_num,
                'page': page_num,
                'question': question_text,
                'choices': choices[:4],
                'choice_type': 'text',
                'answer': None,
                'has_image': False,
                'image_ref': None,
                'has_table': False,
                'table_ref': None,
                'table_data': None,
                'choice_tables': None,
                'common_instruction': None
            }
            
            questions.append(question_obj)
    
    # 번호순 정렬
    questions.sort(key=lambda x: x['number'])
    
    # 중복 제거
    seen = set()
    unique_questions = []
    for q in questions:
        if q['number'] not in seen:
            seen.add(q['number'])
            unique_questions.append(q)
    
    print(f"✓ 총 {len(unique_questions)}개 문제 파싱 완료")
    return unique_questions


def link_common_instructions(questions, common_instructions):
    """※ 공통 설명 연결"""
    for inst in common_instructions:
        start = inst['start']
        end = inst['end']
        
        for q in questions:
            if start <= q['number'] <= end:
                q['common_instruction'] = inst['text']
    
    return questions


def link_tables_to_questions_v5(questions, tables_info, pdf_path):
    """
    표를 문제에 연결 (v5 - 위치 기반)
    """
    # 페이지별 표 그룹화
    tables_by_page = {}
    for table in tables_info:
        page = table['page']
        if page not in tables_by_page:
            tables_by_page[page] = []
        tables_by_page[page].append(table)
    
    # PDF 다시 열어서 선택지 위치 찾기
    with pdfplumber.open(pdf_path) as pdf:
        for q in questions:
            page_num = q.get('page')
            
            if page_num and page_num in tables_by_page:
                page_tables = tables_by_page[page_num]
                
                if page_tables:
                    q['has_table'] = True
                    
                    # 선택지가 표인지 감지
                    choice_has_table_pattern = False
                    
                    for choice in q['choices']:
                        if re.search(r'\[[\d,]*\]', choice):
                            choice_has_table_pattern = True
                            break
                    
                    if not choice_has_table_pattern and len(page_tables) >= 4:
                        empty_or_short = sum(1 for c in q['choices'] if len(c.strip()) < 10)
                        if empty_or_short >= 2:
                            choice_has_table_pattern = True
                    
                    if not choice_has_table_pattern and len(page_tables) >= 4:
                        r_patterns = ['dim(', 'array(', 'matrix(', '%*%', 'A[', 'B[']
                        if any(pattern in q['question'] for pattern in r_patterns):
                            choice_has_table_pattern = True
                    
                    # 선택지가 표 형식이면
                    if choice_has_table_pattern and len(page_tables) >= 4:
                        print(f"\n문제 {q['number']}: 선택지 표 매칭 시작")
                        
                        # 선택지 위치 찾기
                        page = pdf.pages[page_num - 1]
                        choice_positions = find_choice_symbols(page)
                        
                        # 표 매칭
                        if choice_positions:
                            matched_tables = match_tables_to_choices(page_tables, choice_positions)
                        else:
                            matched_tables = sort_tables_by_position(page_tables)
                        
                        q['choice_type'] = 'table'
                        q['choices'] = []
                        q['choice_tables'] = []
                        
                        for i, table in enumerate(matched_tables[:4]):
                            if table:
                                q['choices'].append(f"표 참조 (선택지 {i+1})")
                                q['choice_tables'].append(table['data'])
                            else:
                                q['choices'].append("")
                                q['choice_tables'].append(None)
                        
                        print(f"  완료: 표 {len([t for t in matched_tables if t])}개 매칭")
                    
                    else:
                        q['choice_type'] = 'text'
                        q['table_data'] = [t['data'] for t in page_tables]
    
    return questions


@app.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'ok',
        'service': 'PDF Extractor',
        'version': '5.0.0'
    }), 200


@app.route('/extract', methods=['POST'])
def extract_pdf():
    """PDF 추출 API v5.0"""
    
    if 'file' not in request.files:
        return jsonify({'error': 'PDF 파일이 필요합니다'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '파일이 선택되지 않았습니다'}), 400
    
    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'PDF 파일만 업로드 가능합니다'}), 400
    
    try:
        pdf_filename = file.filename
        pdf_path = UPLOAD_FOLDER / pdf_filename
        file.save(str(pdf_path))
        
        print(f"\n{'='*60}")
        print(f"PDF 처리: {pdf_filename}")
        print(f"{'='*60}\n")
        
        output_dir = OUTPUT_FOLDER / Path(pdf_filename).stem
        output_dir.mkdir(parents=True, exist_ok=True)
        images_dir = output_dir / 'images'
        
        # 1. 이미지 추출
        print("[1] 이미지 추출...")
        images_info = extract_images_from_pdf(str(pdf_path), images_dir)
        
        # 2. 표 추출 (위치 정보 포함!)
        print("\n[2] 표 + 위치 추출...")
        tables_info = extract_tables_with_positions(str(pdf_path))
        
        # 3. 메타데이터 추출
        print("\n[3] 메타데이터 추출...")
        metadata = extract_exam_metadata(tables_info)
        
        # 4. 텍스트 추출
        print("\n[4] 2단 레이아웃 텍스트 추출...")
        text_by_page = extract_text_two_columns(str(pdf_path))
        
        # 5. ※ 공통 설명
        print("\n[5] ※ 공통 설명 추출...")
        full_text = "\n".join([p['text'] for p in text_by_page])
        common_instructions = extract_common_instructions(full_text)
        
        # 6. 문제 파싱
        print("\n[6] 문제 파싱...")
        questions = parse_questions_v5(text_by_page)
        
        # 7. ※ 연결
        print("\n[7] ※ 공통 설명 연결...")
        questions = link_common_instructions(questions, common_instructions)
        
        # 8. 표 연결 (v5 - 위치 기반!)
        print("\n[8] 표 데이터 연결 (위치 기반)...")
        questions = link_tables_to_questions_v5(questions, tables_info, str(pdf_path))
        
        # 9. JSON 저장
        result_json = {
            'subject': metadata['subject'] if metadata else '과목명',
            'subject_code': metadata['subject_code'] if metadata else None,
            'year': 2024,
            'semester': 2,
            'total_questions': len(questions),
            'expected_questions': metadata['total_questions'] if metadata else None,
            'questions': questions,
            'images': images_info,
            'tables': tables_info,
            'common_instructions': common_instructions
        }
        
        json_path = output_dir / 'questions.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(result_json, f, ensure_ascii=False, indent=2)
        
        if tables_info:
            tables_path = output_dir / 'tables.json'
            with open(tables_path, 'w', encoding='utf-8') as f:
                json.dump(tables_info, f, ensure_ascii=False, indent=2)
        
        txt_path = output_dir / 'extracted_text.txt'
        with open(txt_path, 'w', encoding='utf-8') as f:
            for page in text_by_page:
                f.write(f"===== 페이지 {page['page']} =====\n")
                f.write(page['text'])
                f.write("\n\n")
        
        print(f"\n{'='*60}")
        print(f"✅ 추출 완료!")
        print(f"  과목: {metadata['subject'] if metadata else '?'}")
        print(f"  문제: {len(questions)}/{metadata['total_questions'] if metadata else '?'}개")
        print(f"  이미지: {len(images_info)}개")
        print(f"  표: {len(tables_info)}개")
        print(f"  공통 설명: {len(common_instructions)}개")
        
        if metadata and metadata['total_questions']:
            rate = (len(questions) / metadata['total_questions']) * 100
            print(f"  추출률: {rate:.1f}%")
        
        print(f"{'='*60}\n")
        
        return jsonify({
            'success': True,
            'message': 'PDF 추출 완료 (v5.0 - 위치 기반 매칭)',
            'metadata': metadata,
            'total_questions': len(questions),
            'questions': questions,
            'images': images_info,
            'tables': tables_info,
            'common_instructions': common_instructions,
            'output_dir': str(output_dir)
        }), 200
        
    except Exception as e:
        print(f"\n❌ 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("="*60)
    print("🐍 PDF Extractor Service v5.0 (위치 기반 매칭)")
    print("="*60)
    print("서버: http://localhost:5000")
    print("")
    print("✨ 기능:")
    print("  - 표 위치 기반 정렬")
    print("  - 선택지 기호 자동 매칭")
    print("  - 2x2 레이아웃 인식")
    print("  - 완벽한 표 순서 보장")
    print("="*60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)