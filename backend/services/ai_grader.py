"""
AI Grading Service
Professional service for automated exam grading using OpenAI Vision API.
Refactored from Streamlit prototype to production-ready FastAPI service.
"""

import io
import base64
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
import fitz  # PyMuPDF
from openai import OpenAI, OpenAIError
from pydantic import BaseModel, Field


# Configure logging
logger = logging.getLogger(__name__)


class Rationale(BaseModel):
    """Detailed rationale for grading decision"""
    points_awarded: List[str] = Field(default_factory=list)
    points_deducted: List[str] = Field(default_factory=list)
    improvement_tip: str = ""


class QuestionGrade(BaseModel):
    """Individual question grade result"""
    q_num: str
    student_answer: str
    processed_answer: Optional[str] = None
    expected_answer: Optional[str] = None
    marks_obtained: float
    max_marks: float
    feedback: str
    rationale: Optional[Rationale] = None
    concept_alignment: Optional[str] = None


class StudentGradeResult(BaseModel):
    """Complete grade result for one student"""
    student_name: str
    roll_no: str
    results: List[QuestionGrade]
    total_score: float


class GradingError(Exception):
    """Custom exception for grading errors"""
    pass


class AIGradingService:
    """
    Professional AI-powered exam grading service.
    
    Features:
    - Multi-page PDF processing
    - Batch student grading
    - OpenAI Vision API integration
    - Error handling and retries
    - Structured JSON responses
    """
    
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        """
        Initialize the AI grading service.
        
        Args:
            api_key: OpenAI API key
            model: Model to use (default: gpt-4o for vision)
        """
        if not api_key:
            raise ValueError("OpenAI API key is required")
        
        self.client = OpenAI(api_key=api_key)
        self.model = model
        logger.info(f"AI Grading Service initialized with model: {model}")
    
    @staticmethod
    def convert_pdf_to_images(
        pdf_bytes: bytes,
        dpi: int = 300
    ) -> List[Image.Image]:
        """
        Convert PDF bytes to list of PIL images.
        
        Args:
            pdf_bytes: PDF file content as bytes
            dpi: Resolution for rendering (default: 300)
        
        Returns:
            List of PIL Image objects, one per page
        
        Raises:
            GradingError: If PDF conversion fails
        """
        images = []
        
        try:
            # Open PDF with PyMuPDF
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            logger.info(f"Converting PDF: {len(pdf_document)} pages at {dpi} DPI")
            
            # Convert each page to image
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                
                # Render page to image with specified DPI
                mat = fitz.Matrix(dpi/72, dpi/72)
                pix = page.get_pixmap(matrix=mat)
                
                # Convert to PIL Image
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                images.append(img)
                
                logger.debug(f"Converted page {page_num + 1}/{len(pdf_document)}")
            
            pdf_document.close()
            logger.info(f"Successfully converted {len(images)} pages")
            
            return images
            
        except Exception as e:
            logger.error(f"PDF conversion error: {str(e)}")
            raise GradingError(f"Failed to convert PDF: {str(e)}")
    
    @staticmethod
    def image_to_base64(image: Image.Image) -> str:
        """
        Convert PIL Image to base64 string.
        
        Args:
            image: PIL Image object
        
        Returns:
            Base64 encoded image string
        """
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_bytes = buffered.getvalue()
        return base64.b64encode(img_bytes).decode('utf-8')
    
    def grade_exam(
        self,
        professor_key_pdf: bytes,
        student_papers_pdf: bytes,
        marks_per_question: float = 1.0,
        max_tokens: int = 4000,
        temperature: float = 0.2
    ) -> List[StudentGradeResult]:
        """
        Grade student exam papers against professor's answer key.
        
        Supports batch grading - can identify and grade multiple students
        from a single PDF containing multiple exam papers.
        
        Args:
            professor_key_pdf: Professor's answer key PDF (bytes)
            student_papers_pdf: Student exam papers PDF (bytes)
            marks_per_question: Marks allocated per question
            max_tokens: Maximum tokens for API response
            temperature: Model temperature (lower = more consistent)
        
        Returns:
            List of StudentGradeResult objects
        
        Raises:
            GradingError: If grading process fails
        """
        try:
            # Convert PDFs to images
            logger.info("Converting professor's answer key to images...")
            professor_images = self.convert_pdf_to_images(professor_key_pdf)
            
            logger.info("Converting student papers to images...")
            student_images = self.convert_pdf_to_images(student_papers_pdf)
            
            # Convert images to base64
            logger.info("Encoding images to base64...")
            professor_images_base64 = [
                self.image_to_base64(img) for img in professor_images
            ]
            student_images_base64 = [
                self.image_to_base64(img) for img in student_images
            ]
            
            # Prepare system instruction
            system_instruction = self._get_system_instruction()
            
            # Prepare user prompt
            user_prompt = self._get_user_prompt(
                len(professor_images_base64),
                len(student_images_base64),
                marks_per_question
            )
            
            # Build content array with all images
            content = self._build_content_array(
                user_prompt,
                professor_images_base64,
                student_images_base64
            )
            
            # Call OpenAI Vision API
            logger.info(f"Calling OpenAI {self.model} API...")
            response = self._call_openai_api(
                system_instruction,
                content,
                max_tokens,
                temperature
            )
            
            # Parse and validate response
            grading_results = self._parse_grading_response(response)
            
            logger.info(f"Successfully graded {len(grading_results)} student(s)")
            
            return grading_results
            
        except OpenAIError as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise GradingError(f"OpenAI API error: {str(e)}")
        except Exception as e:
            logger.error(f"Grading error: {str(e)}")
            raise GradingError(f"Grading failed: {str(e)}")
    
    @staticmethod
    def _get_system_instruction() -> str:
        """Get the system instruction for AI grading."""
        return (
            "You are a meticulous automated Exam Scanner and Grader with explainable reasoning capabilities. "
            "You will receive a PDF (as a sequence of images) containing exams from MULTIPLE students.\n\n"
            "Task:\n"
            "1. Scan all pages to identify where one student's exam ends and another begins.\n"
            "2. For EACH student found, extract: Name, Roll No, and their answers.\n"
            "3. Grade each student individually against the provided Professor's Answer Key (Image Set A).\n"
            "4. For every mark awarded or deducted, you MUST cross-reference the Professor's Answer Key and specify exactly where the student's logic diverged.\n"
            "5. Provide structured justifications with specific points awarded and deducted.\n"
            "6. Be fair and consistent in grading across all students.\n\n"
            "Output Format: Return a JSON array (list) of objects. Each object represents one student.\n"
            "Example structure:\n"
            '[\n'
            '  {\n'
            '    "student_name": "John Doe",\n'
            '    "roll_no": "001",\n'
            '    "results": [\n'
            '      {\n'
            '        "q_num": "1",\n'
            '        "student_answer": "Raw OCR text of student answer",\n'
            '        "processed_answer": "AI-interpreted version of the answer",\n'
            '        "expected_answer": "Expected answer from professor key",\n'
            '        "marks_obtained": 4.0,\n'
            '        "max_marks": 5.0,\n'
            '        "feedback": "Overall feedback summary",\n'
            '        "rationale": {\n'
            '          "points_awarded": ["Step 1 correct", "Concept A identified correctly", "Formula applied properly"],\n'
            '          "points_deducted": ["Calculation error in step 3", "Missing units in final answer"],\n'
            '          "improvement_tip": "Focus on unit conversion for final answers and double-check calculations."\n'
            '        },\n'
            '        "concept_alignment": "85%"\n'
            '      }\n'
            '    ],\n'
            '    "total_score": 48.0\n'
            '  }\n'
            ']\n\n'
            "CRITICAL RULES:\n"
            "- ALWAYS return a JSON array, even if there's only one student: [single_student]\n"
            "- Ensure all numeric values (marks_obtained, max_marks, total_score) are numbers, not strings\n"
            "- Be thorough in feedback, especially when deducting marks - cite specific discrepancies from the key\n"
            "- For each question, provide detailed rationale with points_awarded and points_deducted arrays\n"
            "- Calculate concept_alignment as a percentage showing how well the student's answer matches key concepts\n"
            "- If handwriting is illegible, mention it in rationale and deduct marks accordingly"
        )
    
    @staticmethod
    def _get_user_prompt(
        professor_pages: int,
        student_pages: int,
        marks_per_question: float
    ) -> str:
        """Generate the user prompt for grading."""
        return f"""
Marks per Question: {marks_per_question}

Analyzing multi-student exam batch:
- Image Set A ({professor_pages} pages): Professor's complete answer key
- Image Set B ({student_pages} pages): Multiple students' exam papers

Instructions:
1. Review ALL pages of the professor's answer key (Image Set A) to understand the exam structure
2. Scan through ALL pages of the student papers (Image Set B)
3. Identify where each student's exam starts (look for new name/roll number)
4. For EACH student found:
   - Extract their name and roll number
   - Grade their answers question by question
   - Compare against the professor's key
   - Provide specific feedback for each question
   - Calculate total score
5. Return a JSON ARRAY with one object per student

Grading Guidelines:
- Full marks: Answer matches professor's key in logic and result
- Partial marks: Correct approach but minor errors or unclear handwriting
- Zero marks: Wrong approach or completely incorrect answer
- Always explain deductions in feedback

Remember: Return [{{student1}}, {{student2}}, ...] format, NOT just {{student1}}
"""
    
    @staticmethod
    def _build_content_array(
        prompt: str,
        professor_images_base64: List[str],
        student_images_base64: List[str]
    ) -> List[Dict[str, Any]]:
        """Build the content array for OpenAI API call."""
        content = [{"type": "text", "text": prompt}]
        
        # Add professor's key images (Image Set A)
        for base64_img in professor_images_base64:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{base64_img}",
                    "detail": "high"
                }
            })
        
        # Add student's paper images (Image Set B)
        for base64_img in student_images_base64:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{base64_img}",
                    "detail": "high"
                }
            })
        
        return content
    
    def _call_openai_api(
        self,
        system_instruction: str,
        content: List[Dict[str, Any]],
        max_tokens: int,
        temperature: float
    ) -> str:
        """
        Call OpenAI Vision API with error handling.
        
        Returns:
            Raw response text from API
        
        Raises:
            OpenAIError: If API call fails
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": system_instruction
                    },
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            response_text = response.choices[0].message.content
            logger.debug(f"API Response length: {len(response_text)} characters")
            
            return response_text
            
        except OpenAIError as e:
            logger.error(f"OpenAI API call failed: {str(e)}")
            raise
    
    def _parse_grading_response(self, response_text: str) -> List[StudentGradeResult]:
        """
        Parse and validate the AI grading response.
        
        Args:
            response_text: Raw response from OpenAI API
        
        Returns:
            List of StudentGradeResult objects
        
        Raises:
            GradingError: If parsing fails
        """
        try:
            # Extract JSON from response (handle code blocks)
            cleaned_response = self._extract_json_from_response(response_text)
            
            # Parse JSON
            grading_data = json.loads(cleaned_response)
            
            # Ensure it's a list
            if not isinstance(grading_data, list):
                if isinstance(grading_data, dict) and (
                    "student_name" in grading_data or "roll_no" in grading_data
                ):
                    # Single student returned as dict, wrap in list
                    grading_data = [grading_data]
                else:
                    raise ValueError(
                        f"Expected list of students, got {type(grading_data).__name__}"
                    )
            
            # Validate and convert to Pydantic models
            results = []
            for student_data in grading_data:
                # Convert results to QuestionGrade objects
                question_grades = []
                for result in student_data.get("results", []):
                    # Parse rationale if present
                    rationale = None
                    if "rationale" in result:
                        rationale_data = result["rationale"]
                        rationale = Rationale(
                            points_awarded=rationale_data.get("points_awarded", []),
                            points_deducted=rationale_data.get("points_deducted", []),
                            improvement_tip=rationale_data.get("improvement_tip", "")
                        )
                    
                    question_grades.append(QuestionGrade(
                        q_num=str(result.get("q_num", "?")),
                        student_answer=result.get("student_answer", "N/A"),
                        processed_answer=result.get("processed_answer"),
                        expected_answer=result.get("expected_answer"),
                        marks_obtained=float(result.get("marks_obtained", 0)),
                        max_marks=float(result.get("max_marks", 0)),
                        feedback=result.get("feedback", ""),
                        rationale=rationale,
                        concept_alignment=result.get("concept_alignment")
                    ))
                
                # Create StudentGradeResult
                student_result = StudentGradeResult(
                    student_name=student_data.get("student_name", "Unknown"),
                    roll_no=student_data.get("roll_no", "N/A"),
                    results=question_grades,
                    total_score=float(student_data.get("total_score", 0))
                )
                
                results.append(student_result)
            
            if not results:
                raise ValueError("No students found in grading response")
            
            return results
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            logger.error(f"Response text: {response_text[:500]}...")
            raise GradingError(f"Failed to parse AI response as JSON: {str(e)}")
        except Exception as e:
            logger.error(f"Response parsing error: {str(e)}")
            raise GradingError(f"Failed to parse grading response: {str(e)}")
    
    @staticmethod
    def _extract_json_from_response(response_text: str) -> str:
        """
        Extract JSON content from API response.
        Handles responses wrapped in markdown code blocks.
        
        Args:
            response_text: Raw API response
        
        Returns:
            Cleaned JSON string
        """
        # Try to extract from ```json code blocks
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            return response_text[json_start:json_end].strip()
        
        # Try to extract from ``` code blocks
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            return response_text[json_start:json_end].strip()
        
        # Return as-is if no code blocks
        return response_text.strip()
