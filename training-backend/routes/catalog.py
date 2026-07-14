# CR-053: Catalog API — courses and missions (read-only, cacheable)
from fastapi import APIRouter, Depends, HTTPException
from middleware.pos_auth import get_current_employee

router = APIRouter(prefix="/api/training", tags=["catalog"])


@router.get("/health")
async def health():
    return {"status": "ok", "service": "training-backend"}


@router.get("/courses")
async def get_courses(employee: dict = Depends(get_current_employee)):
    """Get available courses for the current employee's role."""
    from server import db

    role = employee.get("role", "staff")
    restaurant_id = employee.get("restaurant_id", 0)

    # Get restaurant config (if exists) to filter enabled courses
    config = await db.training_restaurant_config.find_one({"restaurant_id": restaurant_id})
    enabled_course_ids = None
    if config and config.get("enabled_courses"):
        enabled_course_ids = [c["course_id"] for c in config["enabled_courses"] if c.get("course_id")]

    # Get all active courses
    query = {"status": "active"}
    courses = await db.training_courses.find(query, {"_id": 0}).sort("display_order", 1).to_list(100)

    # Filter by role targeting
    result = []
    for course in courses:
        # If restaurant config exists, only show enabled courses
        if enabled_course_ids is not None and course["course_id"] not in enabled_course_ids:
            continue
        # Check if role matches target_roles (or target_roles is empty = all roles)
        target_roles = course.get("target_roles", [])
        if not target_roles or role in target_roles or role == "owner":
            result.append(course)

    return {"courses": result, "employee": employee}


@router.get("/courses/{course_id}/missions")
async def get_course_missions(course_id: str, employee: dict = Depends(get_current_employee)):
    """Get all missions with steps for a course."""
    from server import db

    course = await db.training_courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_id}' not found")

    missions = await db.training_missions.find(
        {"course_id": course_id, "status": "active"},
        {"_id": 0}
    ).sort("display_order", 1).to_list(100)

    return {"course": course, "missions": missions}
