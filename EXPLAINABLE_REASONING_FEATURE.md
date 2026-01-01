# Explainable Reasoning Feature

## Overview
The Explainable Reasoning feature provides detailed AI-powered justifications for every grading decision, helping students understand exactly where they earned or lost points.

## Implementation Details

### Backend Changes

#### 1. Updated Schemas (`backend/app/schemas.py`)
```python
class RationaleSchema(BaseModel):
    points_awarded: List[str]  # Array of specific achievements
    points_deducted: List[str]  # Array of specific mistakes
    improvement_tip: str        # Actionable advice

class QuestionGradeSchema(BaseModel):
    q_num: str
    student_answer: str         # Raw OCR text
    processed_answer: str       # AI-interpreted answer
    expected_answer: str        # From professor's key
    marks_obtained: float
    max_marks: float
    feedback: str
    rationale: RationaleSchema  # Detailed breakdown
    concept_alignment: str      # Percentage match
```

#### 2. Enhanced AI Prompt (`backend/services/ai_grader.py`)
The system instruction now requires the AI to:
- Cross-reference every mark with the professor's answer key
- Provide specific points awarded and deducted
- Calculate concept alignment percentage
- Give actionable improvement tips

Key prompt additions:
```
"For every mark awarded or deducted, you MUST cross-reference the Professor's 
Answer Key and specify exactly where the student's logic diverged."

"Provide structured justifications with specific points awarded and deducted."
```

### Frontend Changes

#### 1. New Component (`frontend/components/question-detail-view.tsx`)
Created a comprehensive detail view with:

**Two-Tab Interface:**
- **AI Analysis Tab**: Shows detailed comparison and reasoning
- **Text Recognition Tab**: Shows raw OCR output

**Three-Column Comparison (AI Analysis Tab):**
1. **Raw Extracted Text** (Blue): Original OCR output
2. **Processed Answer Text** (Neutral): AI-interpreted clean version
3. **Expected Answer** (Green): Professor's answer key

**Rationale Accordion:**
- ✅ Points Awarded (Green checkmarks)
- ❌ Points Deducted (Red X marks)
- 💡 Improvement Tip (Amber highlight box)
- 📈 Concept Alignment percentage

#### 2. Updated Results Page (`frontend/app/dashboard/results/[examId]/page.tsx`)
- Detects if question has new rationale structure
- Renders `QuestionDetailView` for questions with rationale
- Falls back to simple view for older submissions
- Maintains backward compatibility

#### 3. Added Accordion UI
Installed shadcn/ui accordion component for collapsible rationale display.

## Usage

### For Students:
1. Navigate to exam results
2. View the **AI Analysis** tab for detailed breakdown
3. Expand the **Detailed Rationale** accordion to see:
   - Specific points where marks were awarded
   - Specific mistakes that cost points
   - Actionable improvement tips
   - How well their answer aligns with expected concepts

### For Professors:
- The system automatically provides explainable reasoning for all new gradings
- Old submissions without rationale still display normally
- Can review AI justifications to ensure fair grading

## Benefits

1. **Transparency**: Every grading decision is explained
2. **Learning**: Students see exactly what they did right/wrong
3. **Consistency**: AI cross-references professor's key for every mark
4. **Improvement**: Actionable tips help students learn
5. **Trust**: Concept alignment percentage shows objective analysis

## Technical Notes

- Backward compatible with existing submissions
- Graceful degradation for questions without rationale
- Color-coded UI for easy visual scanning
- Collapsible accordion keeps interface clean
- Responsive design works on all screen sizes

## Future Enhancements

Potential additions:
- Export detailed rationale to PDF
- Compare multiple student answers side-by-side
- Historical trend analysis of common mistakes
- AI-suggested study materials based on weak areas
