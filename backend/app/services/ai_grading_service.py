"""
AI Grading Service — Gemini-powered automatic submission evaluation.

grade_submission(submission, task) → GradingResult
  - Calls Gemini with a structured academic prompt
  - Returns score (0-100), letter grade, summary, strengths, weaknesses,
    rubric breakdown, and improvement suggestions
  - Never raises — returns a fallback result if the API fails

SAFETY:
  - API key read from settings (never hardcoded)
  - Graceful degradation: if Gemini is unavailable, returns a neutral result
    so the submission flow is never blocked
"""
import json
import logging
import asyncio
from dataclasses import dataclass, field
from typing import Optional

from app.config.settings import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()


def _score_to_grade(score: int) -> str:
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 70: return "C"
    if score >= 60: return "D"
    return "F"


@dataclass
class GradingResult:
    score:        int            # 0–100
    grade:        str            # A / B / C / D / F
    feedback:     str            # overall summary paragraph (alias: summary)
    strengths:    list[str]      # 2–4 bullet points
    improvements: list[str]      # 2–4 bullet points (areas to improve)
    suggestions:  list[str]      # 2–4 actionable improvement suggestions
    rubric:       dict           # { "Technical Accuracy": 25, ... }
    confidence:   str  = "medium"  # "high" | "medium" | "low"
    graded_by:    str  = "AI"    # "AI" or "teacher"
    status:       str  = "completed"


# ── Fallback result when Gemini is unavailable ────────────────────────────────
def _fallback(reason: str) -> GradingResult:
    return GradingResult(
        score        = 0,
        grade        = "F",
        feedback     = "Automatic grading is currently unavailable. Your instructor will review this submission.",
        strengths    = [],
        improvements = [],
        suggestions  = [],
        rubric       = {},
        confidence   = "low",
        graded_by    = "AI",
        status       = "failed",
    )


# ── Prompt builder ────────────────────────────────────────────────────────────
def _build_prompt(task: dict, submission_text: str) -> str:
    title       = task.get("title", "Untitled Task")
    description = task.get("description", "No description provided.")
    subject     = task.get("subject", "General")

    return f"""You are a strict but fair academic evaluator grading a student submission.

ASSIGNMENT DETAILS:
- Title: {title}
- Subject: {subject}
- Description: {description}

STUDENT SUBMISSION:
{submission_text}

Evaluate the submission across these rubric dimensions (each out of 25):
1. Technical Accuracy — correctness of facts, concepts, and technical content
2. Implementation — quality of solution, approach, and methodology
3. Clarity — structure, readability, and communication quality
4. Innovation — originality, depth of thinking, and problem-solving creativity

Return ONLY a valid JSON object in this EXACT format (no markdown, no extra text):
{{
  "score": <integer 0-100, sum of rubric scores>,
  "summary": "<2-3 sentence overall assessment explaining the grade>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],
  "suggestions": ["<actionable improvement 1>", "<actionable improvement 2>", "<actionable improvement 3>"],
  "confidence": "<high|medium|low — how confident you are in this evaluation>",
  "rubric": {{
    "Technical Accuracy": <integer 0-25>,
    "Implementation": <integer 0-25>,
    "Clarity": <integer 0-25>,
    "Innovation": <integer 0-25>
  }}
}}

Rules:
- Be specific — reference actual content from the submission
- Strengths must explain WHY marks were awarded
- Weaknesses must explain WHY marks were deducted
- Suggestions must be actionable and concrete
- Score must equal the sum of all rubric scores"""


# ── Core grading function ─────────────────────────────────────────────────────
async def grade_submission(
    submission: dict,
    task: dict,
) -> GradingResult:
    """
    Grade a student submission using Gemini.

    Parameters
    ----------
    submission : dict  — the submission document from MongoDB
    task       : dict  — the task document from MongoDB

    Returns
    -------
    GradingResult — never raises, falls back gracefully on any error
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key or api_key == "PASTE_YOUR_NEW_KEY_HERE":
        logger.warning("[ai_grading] GEMINI_API_KEY not configured — skipping AI grading")
        return _fallback("API key not configured")

    submission_text = submission.get("textSubmission", "").strip()
    if not submission_text:
        logger.info("[ai_grading] No text submission — skipping AI grading")
        return GradingResult(
            score        = 0,
            grade        = "F",
            feedback     = "No text submission provided. File submissions require manual review.",
            strengths    = [],
            improvements = ["Please provide a text response for automatic grading."],
            suggestions  = ["Submit a written response to receive AI evaluation."],
            rubric       = {},
            status       = "completed",
        )

    raw = ""
    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model  = genai.GenerativeModel("gemini-flash-lite-latest")
        prompt = _build_prompt(task, submission_text)

        loop     = asyncio.get_event_loop()
        last_exc = None

        for attempt in range(3):
            try:
                response = await loop.run_in_executor(
                    None,
                    lambda: model.generate_content(prompt)
                )
                break
            except Exception as e:
                last_exc = e
                err_str  = str(e)
                if "429" in err_str or "quota" in err_str.lower():
                    wait = 2 ** attempt * 5
                    logger.warning(f"[ai_grading] Rate limited, retrying in {wait}s (attempt {attempt+1}/3)")
                    await asyncio.sleep(wait)
                else:
                    raise
        else:
            raise last_exc

        raw = response.text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)

        # ── Parse and clamp all fields ────────────────────────────────────────
        score       = max(0, min(100, int(data.get("score", 0))))
        grade       = _score_to_grade(score)
        feedback    = str(data.get("summary", data.get("feedback", ""))).strip() or "No summary provided."
        strengths   = [str(s) for s in data.get("strengths",   []) if s][:5]
        weaknesses  = [str(s) for s in data.get("weaknesses",  []) if s][:5]
        suggestions = [str(s) for s in data.get("suggestions", []) if s][:5]

        # Confidence — validate against allowed values
        raw_conf   = str(data.get("confidence", "medium")).lower().strip()
        confidence = raw_conf if raw_conf in ("high", "medium", "low") else "medium"

        # Rubric — clamp each dimension to 0–25
        raw_rubric = data.get("rubric", {})
        rubric: dict = {}
        for dim in ["Technical Accuracy", "Implementation", "Clarity", "Innovation"]:
            rubric[dim] = max(0, min(25, int(raw_rubric.get(dim, 0))))

        # If rubric sum differs from score, trust the rubric sum
        rubric_sum = sum(rubric.values())
        if rubric_sum > 0 and abs(rubric_sum - score) > 5:
            score = rubric_sum
            grade = _score_to_grade(score)

        logger.info(
            f"[ai_grading] Graded submission={submission.get('id', '?')} "
            f"score={score} grade={grade} confidence={confidence}"
        )

        return GradingResult(
            score        = score,
            grade        = grade,
            feedback     = feedback,
            strengths    = strengths,
            improvements = weaknesses,
            suggestions  = suggestions,
            rubric       = rubric,
            confidence   = confidence,
        )

    except json.JSONDecodeError as e:
        logger.error(f"[ai_grading] JSON parse error: {e} — raw: {raw[:300]!r}")
        return _fallback("JSON parse error")
    except Exception as e:
        logger.error(f"[ai_grading] Gemini API error: {e}")
        return _fallback(str(e))
