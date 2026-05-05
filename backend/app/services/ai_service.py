"""
AI Service — Provides automated feedback for submissions.
"""
import asyncio
import random
import logging
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

async def analyze_submission(submission_id: str, db: AsyncIOMotorDatabase):
    """
    Simulates AI analysis of a submission.
    In a real-world scenario, this would call an LLM (e.g., Gemini).
    """
    try:
        # 1. Update status to pending
        await db.submissions.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {"aiFeedback.status": "pending"}}
        )

        # 2. Fetch submission content
        submission = await db.submissions.find_one({"_id": ObjectId(submission_id)})
        if not submission:
            logger.error(f"Submission {submission_id} not found for AI analysis.")
            return

        text = submission.get("textSubmission", "")
        
        # 3. Simulate processing delay
        await asyncio.sleep(3) 

        # 4. Generate "AI" feedback (Mock logic)
        score = random.randint(70, 95)
        if len(text) < 50:
            summary = "The submission is quite brief. Consider expanding on your thoughts to provide more depth."
            suggestions = [
                "Include more specific examples to support your points.",
                "Ensure all parts of the prompt are addressed in detail.",
                "Check for proper formatting and structure."
            ]
            score -= 10
        else:
            summary = "Well-structured submission with a clear focus. The points are articulated effectively."
            suggestions = [
                "Great job on the level of detail provided.",
                "Consider using bullet points for better readability in complex sections.",
                "Overall, a strong attempt at the assignment."
            ]

        feedback = {
            "summary": summary,
            "suggestions": suggestions,
            "score": max(0, min(100, score)),
            "status": "completed"
        }

        # 5. Save back to DB
        await db.submissions.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {"aiFeedback": feedback}}
        )
        logger.info(f"AI analysis completed for submission {submission_id}")

    except Exception as e:
        logger.error(f"AI analysis failed for submission {submission_id}: {e}")
        await db.submissions.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {"aiFeedback.status": "failed"}}
        )
