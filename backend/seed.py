"""
ScholarOS — Demo Data Seed Script
===================================
Creates realistic demo accounts, classes, assignments, submissions,
and AI-graded results so the app looks polished for demos.

Usage:
    python seed.py              # seed fresh data
    python seed.py --wipe       # wipe existing demo data first

WARNING: This script writes to the database configured in .env.
         Do NOT run against a production database with real user data.
"""
import asyncio
import argparse
import sys
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.config.settings import get_settings
from app.utils.password import hash_password

settings = get_settings()

# ── Demo data definitions ─────────────────────────────────────────────────────

INSTRUCTOR = {
    "name":     "Dr. Priya Sharma",
    "email":    "priya.sharma@scholaros.demo",
    "password": "Demo@1234",
    "role":     "teacher",
    "profile": {
        "full_name":      "Dr. Priya Sharma",
        "college_name":   "RV College of Engineering",
        "qualification":  "PhD in Computer Science",
        "department":     "CSE",
        "contact_number": "9876543210",
        "email":          "priya.sharma@rvce.edu.in",
    },
}

STUDENTS = [
    {
        "name":     "Arjun Mehta",
        "email":    "arjun.mehta@scholaros.demo",
        "password": "Demo@1234",
        "role":     "student",
        "profile": {
            "full_name":    "Arjun Mehta",
            "college_name": "RV College of Engineering",
            "usn":          "1RV21CS010",
            "department":   "CSE",
            "semester":     5,
            "year":         3,
            "overall_sgpa": 8.7,
        },
    },
    {
        "name":     "Sneha Patel",
        "email":    "sneha.patel@scholaros.demo",
        "password": "Demo@1234",
        "role":     "student",
        "profile": {
            "full_name":    "Sneha Patel",
            "college_name": "RV College of Engineering",
            "usn":          "1RV21CS025",
            "department":   "CSE",
            "semester":     5,
            "year":         3,
            "overall_sgpa": 9.1,
        },
    },
    {
        "name":     "Rahul Nair",
        "email":    "rahul.nair@scholaros.demo",
        "password": "Demo@1234",
        "role":     "student",
        "profile": {
            "full_name":    "Rahul Nair",
            "college_name": "RV College of Engineering",
            "usn":          "1RV21CS042",
            "department":   "CSE",
            "semester":     5,
            "year":         3,
            "overall_sgpa": 7.8,
        },
    },
]

CLASS_NAME = "Advanced Machine Learning — Batch 2024"
JOIN_CODE  = "DEMO01"

ASSIGNMENTS = [
    {
        "title":          "Neural Network Architecture Design",
        "subject":        "Machine Learning",
        "description":    "Design and explain a neural network architecture for image classification. Include layer descriptions, activation functions, and justify your design choices.",
        "priority":       "high",
        "submissionType": "text",
        "daysFromNow":    7,
    },
    {
        "title":          "Gradient Descent Optimization Analysis",
        "subject":        "Machine Learning",
        "description":    "Compare SGD, Adam, and RMSProp optimizers. Explain convergence behaviour, hyperparameter sensitivity, and when to use each.",
        "priority":       "medium",
        "submissionType": "text",
        "daysFromNow":    14,
    },
    {
        "title":          "Overfitting and Regularization Techniques",
        "subject":        "Machine Learning",
        "description":    "Explain L1/L2 regularization, dropout, and early stopping. Provide examples of when each technique is most effective.",
        "priority":       "medium",
        "submissionType": "text",
        "daysFromNow":    -2,   # overdue
    },
]

# Submissions per student per assignment (index matches ASSIGNMENTS)
SUBMISSIONS = {
    "Arjun Mehta": [
        {
            "text": (
                "For image classification I would design a CNN with the following architecture: "
                "Input layer (224x224x3) → Conv2D(32, 3x3, ReLU) → MaxPool(2x2) → "
                "Conv2D(64, 3x3, ReLU) → MaxPool(2x2) → Conv2D(128, 3x3, ReLU) → "
                "GlobalAveragePooling → Dense(256, ReLU) → Dropout(0.5) → Dense(num_classes, Softmax). "
                "I chose ReLU to avoid vanishing gradients and Softmax for multi-class probability output. "
                "MaxPooling reduces spatial dimensions while retaining dominant features. "
                "Dropout prevents overfitting on the dense layers."
            ),
            "ai_score": 88, "ai_grade": "B",
            "ai_feedback": "Strong architectural understanding with clear justification for each layer choice.",
            "strengths": ["Clear layer-by-layer explanation", "Correct use of activation functions", "Dropout rationale is sound"],
            "improvements": ["Could discuss batch normalisation", "Transfer learning not mentioned"],
        },
        {
            "text": (
                "SGD updates weights using a single sample or mini-batch, making it noisy but fast. "
                "Adam combines momentum and RMSProp, adapting learning rates per parameter — ideal for sparse gradients. "
                "RMSProp divides the learning rate by a running average of squared gradients, good for RNNs. "
                "I would use Adam for most deep learning tasks due to its robustness, SGD with momentum for CNNs "
                "where fine-tuned convergence matters, and RMSProp for sequence models."
            ),
            "ai_score": 91, "ai_grade": "A",
            "ai_feedback": "Excellent comparative analysis with practical recommendations.",
            "strengths": ["Accurate descriptions of all three optimizers", "Practical use-case guidance", "Mentions sparse gradients"],
            "improvements": ["Could include convergence rate comparisons", "Learning rate scheduling not discussed"],
        },
        None,  # no submission for overdue assignment
    ],
    "Sneha Patel": [
        {
            "text": (
                "My proposed CNN architecture for image classification: "
                "VGG-inspired design with 3 convolutional blocks. Each block: Conv2D → BatchNorm → ReLU → Conv2D → BatchNorm → ReLU → MaxPool. "
                "Final layers: Flatten → Dense(512, ReLU) → Dropout(0.4) → Dense(num_classes, Softmax). "
                "BatchNorm accelerates training and reduces internal covariate shift. "
                "I chose this over ResNet for simplicity while maintaining good accuracy on standard datasets."
            ),
            "ai_score": 95, "ai_grade": "A",
            "ai_feedback": "Outstanding design with batch normalisation included and excellent justification.",
            "strengths": ["Includes batch normalisation", "VGG-inspired design is well-justified", "Compares to ResNet thoughtfully"],
            "improvements": ["Could discuss data augmentation strategies"],
        },
        {
            "text": (
                "Comparison of optimizers: SGD is simple but requires careful learning rate tuning. "
                "Adam is adaptive and generally converges faster. RMSProp is effective for non-stationary objectives. "
                "Hyperparameter sensitivity: SGD is most sensitive to lr, Adam is robust with default β1=0.9, β2=0.999. "
                "Recommendation: Adam for transformers and NLP, SGD+momentum for vision tasks with fine-tuned schedules."
            ),
            "ai_score": 89, "ai_grade": "B",
            "ai_feedback": "Good analysis with domain-specific recommendations.",
            "strengths": ["Mentions hyperparameter defaults", "Domain-specific recommendations", "Non-stationary objective insight"],
            "improvements": ["Convergence proofs not discussed", "Could add empirical benchmarks"],
        },
        None,
    ],
    "Rahul Nair": [
        {
            "text": (
                "CNN for image classification: Input → Conv(32) → ReLU → Pool → Conv(64) → ReLU → Pool → FC → Softmax. "
                "ReLU is used because it is computationally efficient and avoids vanishing gradients. "
                "Softmax gives probability distribution over classes."
            ),
            "ai_score": 72, "ai_grade": "C",
            "ai_feedback": "Basic architecture described but lacks depth in justification.",
            "strengths": ["Correct basic structure", "ReLU rationale mentioned"],
            "improvements": ["No batch normalisation or dropout", "Architecture not justified in detail", "Missing discussion of depth vs width tradeoffs"],
        },
        None,  # not submitted
        None,
    ],
}


# ── Seed logic ────────────────────────────────────────────────────────────────

async def wipe_demo_data(db):
    """Remove all documents created by this seed script."""
    demo_emails = [INSTRUCTOR["email"]] + [s["email"] for s in STUDENTS]
    users = await db.users.find({"email": {"$in": demo_emails}}).to_list(None)
    user_ids = [u["_id"] for u in users]

    if not user_ids:
        print("No demo data found to wipe.")
        return

    # Find demo class
    cls = await db.classes.find_one({"joinCode": JOIN_CODE})
    if cls:
        task_ids = [t["_id"] async for t in db.tasks.find({"classId": cls["_id"]}, {"_id": 1})]
        await db.submissions.delete_many({"taskId": {"$in": task_ids}})
        await db.tasks.delete_many({"classId": cls["_id"]})
        await db.classes.delete_one({"_id": cls["_id"]})

    await db.users.delete_many({"_id": {"$in": user_ids}})
    await db.notifications.delete_many({"userId": {"$in": user_ids}})
    await db.activity_logs.delete_many({"userId": {"$in": user_ids}})
    print("✅ Demo data wiped.")


async def seed(wipe_first: bool = False):
    client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    db     = client[settings.DB_NAME]

    try:
        await client.admin.command("ping")
        print(f"✅ Connected to MongoDB: {settings.DB_NAME}")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        sys.exit(1)

    if wipe_first:
        await wipe_demo_data(db)

    now = datetime.now(timezone.utc)

    # ── Create instructor ─────────────────────────────────────────────────────
    existing = await db.users.find_one({"email": INSTRUCTOR["email"]})
    if existing:
        print(f"⚠️  Instructor already exists — skipping user creation. Use --wipe to reset.")
        instructor_id = existing["_id"]
    else:
        res = await db.users.insert_one({
            "name":     INSTRUCTOR["name"],
            "email":    INSTRUCTOR["email"],
            "password": hash_password(INSTRUCTOR["password"]),
            "role":     INSTRUCTOR["role"],
            "profile":  INSTRUCTOR["profile"],
        })
        instructor_id = res.inserted_id
        print(f"✅ Instructor created: {INSTRUCTOR['email']}")

    # ── Create students ───────────────────────────────────────────────────────
    student_ids = []
    for s in STUDENTS:
        existing = await db.users.find_one({"email": s["email"]})
        if existing:
            student_ids.append(existing["_id"])
            print(f"⚠️  Student {s['email']} already exists — skipping.")
        else:
            res = await db.users.insert_one({
                "name":     s["name"],
                "email":    s["email"],
                "password": hash_password(s["password"]),
                "role":     s["role"],
                "profile":  s["profile"],
            })
            student_ids.append(res.inserted_id)
            print(f"✅ Student created: {s['email']}")

    # ── Create class ──────────────────────────────────────────────────────────
    cls = await db.classes.find_one({"joinCode": JOIN_CODE})
    if cls:
        class_id = cls["_id"]
        print(f"⚠️  Class already exists — skipping.")
    else:
        res = await db.classes.insert_one({
            "name":      CLASS_NAME,
            "teacherId": instructor_id,
            "students":  student_ids,
            "joinCode":  JOIN_CODE,
            "createdAt": now,
        })
        class_id = res.inserted_id
        print(f"✅ Class created: {CLASS_NAME} (code: {JOIN_CODE})")

    # ── Create assignments ────────────────────────────────────────────────────
    task_ids = []
    for a in ASSIGNMENTS:
        due = now + timedelta(days=a["daysFromNow"])
        existing_task = await db.tasks.find_one({"title": a["title"], "classId": class_id})
        if existing_task:
            task_ids.append(existing_task["_id"])
            print(f"⚠️  Task '{a['title']}' already exists — skipping.")
            continue
        res = await db.tasks.insert_one({
            "title":          a["title"],
            "subject":        a["subject"],
            "description":    a["description"],
            "priority":       a["priority"],
            "submissionType": a["submissionType"],
            "status":         "pending",
            "dueDate":        due,
            "classId":        class_id,
            "createdBy":      instructor_id,
            "assignedTo":     student_ids,
            "createdAt":      now,
            "updatedAt":      now,
        })
        task_ids.append(res.inserted_id)
        print(f"✅ Assignment created: {a['title']}")

    # ── Create submissions + AI feedback ──────────────────────────────────────
    for i, student in enumerate(STUDENTS):
        student_id = student_ids[i]
        student_subs = list(SUBMISSIONS[student["name"]])

        for j, sub_data in enumerate(student_subs):
            if sub_data is None:
                continue
            task_id = task_ids[j]

            existing_sub = await db.submissions.find_one({
                "taskId": task_id, "studentId": student_id
            })
            if existing_sub:
                print(f"⚠️  Submission by {student['name']} for task {j+1} already exists — skipping.")
                continue

            submitted_at = now - timedelta(days=2, hours=j)
            await db.submissions.insert_one({
                "taskId":         task_id,
                "studentId":      student_id,
                "textSubmission": sub_data["text"],
                "status":         "submitted",
                "submittedAt":    submitted_at,
                "createdAt":      submitted_at,
                "updatedAt":      submitted_at,
                "versions": [{
                    "textSubmission": sub_data["text"],
                    "fileUrl":        None,
                    "submittedAt":    submitted_at,
                }],
                "aiFeedback": {
                    "score":        sub_data["ai_score"],
                    "grade":        sub_data["ai_grade"],
                    "feedback":     sub_data["ai_feedback"],
                    "strengths":    sub_data["strengths"],
                    "improvements": sub_data["improvements"],
                    "suggestions":  ["Review lecture notes on advanced topics", "Practice with real datasets"],
                    "rubric": {
                        "Technical Accuracy": round(sub_data["ai_score"] * 0.40),
                        "Implementation":     round(sub_data["ai_score"] * 0.30),
                        "Clarity":            round(sub_data["ai_score"] * 0.20),
                        "Innovation":         round(sub_data["ai_score"] * 0.10),
                    },
                    "confidence":  "high",
                    "graded_by":   "AI",
                    "status":      "completed",
                },
                "finalGrade": {
                    "score":     sub_data["ai_score"],
                    "grade":     sub_data["ai_grade"],
                    "feedback":  sub_data["ai_feedback"],
                    "graded_by": "AI",
                    "status":    "completed",
                },
                "reviewedByTeacher": False,
            })
            print(f"✅ Submission + AI grade: {student['name']} → Task {j+1} ({sub_data['ai_score']}/100 {sub_data['ai_grade']})")

    print("\n" + "=" * 60)
    print("🎓 ScholarOS demo data seeded successfully!")
    print("=" * 60)
    print(f"\n  Instructor login:")
    print(f"    Email:    {INSTRUCTOR['email']}")
    print(f"    Password: {INSTRUCTOR['password']}")
    print(f"\n  Student logins (all use password: {STUDENTS[0]['password']}):")
    for s in STUDENTS:
        print(f"    {s['email']}")
    print(f"\n  Class join code: {JOIN_CODE}")
    print()

    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed ScholarOS demo data")
    parser.add_argument("--wipe", action="store_true", help="Wipe existing demo data before seeding")
    args = parser.parse_args()
    asyncio.run(seed(wipe_first=args.wipe))
