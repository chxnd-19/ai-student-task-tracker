from fastapi import APIRouter, Depends, HTTPException, Body
from app.database.connection import get_db
from app.utils.dependencies import get_current_user
from app.utils.responses import ok, ok_msg
from app.utils.password import hash_password
from app.utils.object_id import to_object_id

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.put("", summary="Update user profile")
async def update_profile(
    payload: dict = Body(...),
    user: dict = Depends(get_current_user)
):
    try:
        db = get_db()
        user_id = to_object_id(user["id"])
        
        update_data = {}
        if "name" in payload:
            update_data["name"] = payload["name"].strip()
        
        if "email" in payload:
            email = payload["email"].lower().strip()
            # Check if email is already taken by another user
            existing = await db.users.find_one({"email": email, "_id": {"$ne": user_id}})
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
            update_data["email"] = email
            
        if "password" in payload and payload["password"]:
            update_data["password"] = hash_password(payload["password"])
            
        if not update_data:
            return ok_msg("No changes provided")
            
        result = await db.users.update_one(
            {"_id": user_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return ok_msg("Profile already up to date")
            
        # Get updated user data
        updated_user = await db.users.find_one({"_id": user_id})
        user_out = {
            "id": str(updated_user["_id"]),
            "name": updated_user["name"],
            "email": updated_user["email"],
            "role": updated_user["role"]
        }
        
        return ok(user_out)
    except HTTPException:
        raise
    except Exception as e:
        print(f"UPDATE PROFILE ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")
