# CR-053: Progress API — start, step-complete, skip, reset, sync
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from middleware.pos_auth import get_current_employee
from models.base import utc_now

router = APIRouter(prefix="/api/training/progress", tags=["progress"])


class StartMissionRequest(BaseModel):
    course_id: str
    mission_id: str


class StepCompleteRequest(BaseModel):
    course_id: str
    mission_id: str
    step_id: str
    time_spent_seconds: int = 0


class SkipMissionRequest(BaseModel):
    course_id: str
    mission_id: str
    reason: Optional[str] = None


class ResetMissionRequest(BaseModel):
    course_id: str
    mission_id: str


class SyncRequest(BaseModel):
    actions: List[dict]


@router.get("/me")
async def get_my_progress(employee: dict = Depends(get_current_employee)):
    """Get current employee's full training progress across all courses."""
    from server import db

    emp_id = employee["employee_id"]
    rest_id = employee["restaurant_id"]

    # Get all progress docs for this employee
    progress_docs = await db.training_progress.find(
        {"restaurant_id": rest_id, "employee_id": emp_id},
        {"_id": 0}
    ).to_list(500)

    # Get all courses to compute overall stats
    courses = await db.training_courses.find({"status": "active"}, {"_id": 0}).to_list(100)

    # Build per-course summary + per-mission status map
    course_progress = {}
    mission_status = {}  # CR-053-UX-01: {mission_id: "completed"|"in_progress"|"skipped"|"not_started"}
    for doc in progress_docs:
        cid = doc["course_id"]
        mid = doc["mission_id"]
        if cid not in course_progress:
            course_progress[cid] = {"completed": 0, "skipped": 0, "in_progress": 0, "not_started": 0, "current_mission": None}
        status = doc.get("status", "not_started")
        mission_status[mid] = status
        if status == "completed":
            course_progress[cid]["completed"] += 1
        elif status == "skipped":
            course_progress[cid]["skipped"] += 1
        elif status == "in_progress":
            course_progress[cid]["in_progress"] += 1
            course_progress[cid]["current_mission"] = {
                "mission_id": doc["mission_id"],
                "current_step": doc.get("current_step"),
                "steps_completed": len(doc.get("steps_completed", [])),
            }
        else:
            course_progress[cid]["not_started"] += 1

    # Build response with course metadata
    course_summaries = []
    total_completed = 0
    total_missions = 0
    for course in courses:
        cid = course["course_id"]
        cp = course_progress.get(cid, {"completed": 0, "skipped": 0, "in_progress": 0, "not_started": 0, "current_mission": None})
        total = course.get("mission_count", 0)
        done = cp["completed"]
        total_completed += done
        total_missions += total
        progress_pct = (done / total * 100) if total > 0 else 0
        course_summaries.append({
            "course_id": cid,
            "title": course["title"],
            "icon": course.get("icon", ""),
            "cover_color": course.get("cover_color", "#329937"),
            "difficulty": course.get("difficulty", "beginner"),
            "estimated_time_minutes": course.get("estimated_time_minutes", 0),
            "total_missions": total,
            "completed": done,
            "skipped": cp["skipped"],
            "in_progress": cp["in_progress"],
            "not_started": max(0, total - done - cp["skipped"] - cp["in_progress"]),
            "progress": round(progress_pct, 1),
            "status": "completed" if done == total and total > 0 else ("in_progress" if done > 0 or cp["in_progress"] > 0 else "not_started"),
            "current_mission": cp["current_mission"],
        })

    overall = (total_completed / total_missions * 100) if total_missions > 0 else 0

    return {
        "employee": employee,
        "overall_progress": round(overall, 1),
        "total_completed": total_completed,
        "total_missions": total_missions,
        "courses": course_summaries,
        "mission_status": mission_status,  # CR-053-UX-01: per-mission status map for explicit picker
    }


@router.post("/start")
async def start_mission(req: StartMissionRequest, employee: dict = Depends(get_current_employee)):
    """Start or resume a mission."""
    from server import db

    emp_id = employee["employee_id"]
    rest_id = employee["restaurant_id"]
    now = utc_now().isoformat()

    # Check if progress doc already exists
    existing = await db.training_progress.find_one({
        "restaurant_id": rest_id, "employee_id": emp_id,
        "course_id": req.course_id, "mission_id": req.mission_id
    })

    if existing and existing.get("status") == "completed":
        return {"status": "already_completed", "progress_id": str(existing["_id"])}

    if existing and existing.get("status") == "in_progress":
        return {
            "status": "resumed",
            "progress_id": str(existing["_id"]),
            "current_step": existing.get("current_step"),
            "steps_completed": existing.get("steps_completed", []),
        }

    # Get mission to find first step
    mission = await db.training_missions.find_one({"mission_id": req.mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission '{req.mission_id}' not found")

    steps = mission.get("steps", [])
    first_step = steps[0]["step_id"] if steps else None

    if existing:
        # Reset to in_progress (was skipped or not_started)
        await db.training_progress.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "status": "in_progress", "current_step": first_step,
                "started_at": now, "last_active_at": now,
                "steps_completed": [], "steps_skipped": [],
                "updated_at": now,
            }, "$inc": {"attempts": 1}}
        )
        progress_id = str(existing["_id"])
    else:
        # Create new progress doc
        doc = {
            "restaurant_id": rest_id, "employee_id": emp_id,
            "employee_name": employee.get("name", ""), "employee_role": employee.get("role", ""),
            "course_id": req.course_id, "mission_id": req.mission_id,
            "status": "in_progress", "started_at": now, "last_active_at": now,
            "current_step": first_step, "steps_completed": [], "steps_skipped": [],
            "attempts": 1, "time_spent_seconds": 0,
            "mission_version": mission.get("version", 1),
            "created_at": now, "updated_at": now,
        }
        result = await db.training_progress.insert_one(doc)
        progress_id = str(result.inserted_id)

    # Log activity
    await db.training_activity_log.insert_one({
        "restaurant_id": rest_id, "employee_id": emp_id,
        "event_type": "mission_started", "course_id": req.course_id,
        "mission_id": req.mission_id, "metadata": {"attempt": 1},
        "timestamp": now,
    })

    return {"status": "started", "progress_id": progress_id, "current_step": first_step}


@router.post("/step-complete")
async def step_complete(req: StepCompleteRequest, employee: dict = Depends(get_current_employee)):
    """Mark a step as completed and advance to next."""
    from server import db

    emp_id = employee["employee_id"]
    rest_id = employee["restaurant_id"]
    now = utc_now().isoformat()

    # Get progress doc
    progress = await db.training_progress.find_one({
        "restaurant_id": rest_id, "employee_id": emp_id,
        "course_id": req.course_id, "mission_id": req.mission_id
    })
    if not progress:
        raise HTTPException(status_code=404, detail="No active progress for this mission")

    # Get mission steps to find next
    mission = await db.training_missions.find_one({"mission_id": req.mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    steps = mission.get("steps", [])
    step_ids = [s["step_id"] for s in steps]

    # Add to completed
    completed = progress.get("steps_completed", [])
    if req.step_id not in completed:
        completed.append(req.step_id)

    # Find next step
    current_idx = step_ids.index(req.step_id) if req.step_id in step_ids else -1
    next_step = step_ids[current_idx + 1] if current_idx + 1 < len(step_ids) else None
    mission_complete = next_step is None

    update = {
        "$set": {
            "steps_completed": completed,
            "current_step": next_step,
            "last_active_at": now,
            "updated_at": now,
        },
        "$inc": {"time_spent_seconds": req.time_spent_seconds}
    }

    if mission_complete:
        update["$set"]["status"] = "completed"
        update["$set"]["completed_at"] = now
        update["$set"]["current_step"] = None

    await db.training_progress.update_one({"_id": progress["_id"]}, update)

    # Log activity
    event_type = "mission_completed" if mission_complete else "step_completed"
    await db.training_activity_log.insert_one({
        "restaurant_id": rest_id, "employee_id": emp_id,
        "event_type": event_type, "course_id": req.course_id,
        "mission_id": req.mission_id, "step_id": req.step_id,
        "metadata": {"time_spent_seconds": req.time_spent_seconds},
        "timestamp": now,
    })

    return {
        "status": "completed" if mission_complete else "in_progress",
        "next_step": next_step,
        "mission_complete": mission_complete,
        "steps_completed": len(completed),
        "total_steps": len(step_ids),
    }


@router.post("/skip-mission")
async def skip_mission(req: SkipMissionRequest, employee: dict = Depends(get_current_employee)):
    """Skip a mission."""
    from server import db

    emp_id = employee["employee_id"]
    rest_id = employee["restaurant_id"]
    now = utc_now().isoformat()

    await db.training_progress.update_one(
        {"restaurant_id": rest_id, "employee_id": emp_id, "course_id": req.course_id, "mission_id": req.mission_id},
        {"$set": {"status": "skipped", "skipped_at": now, "updated_at": now, "current_step": None,
                  "employee_name": employee.get("name", ""), "employee_role": employee.get("role", "")}},
        upsert=True
    )

    await db.training_activity_log.insert_one({
        "restaurant_id": rest_id, "employee_id": emp_id,
        "event_type": "mission_skipped", "course_id": req.course_id,
        "mission_id": req.mission_id, "metadata": {"reason": req.reason},
        "timestamp": now,
    })

    return {"status": "skipped"}


@router.post("/reset-mission")
async def reset_mission(req: ResetMissionRequest, employee: dict = Depends(get_current_employee)):
    """Reset progress on a mission to retake it."""
    from server import db

    emp_id = employee["employee_id"]
    rest_id = employee["restaurant_id"]

    await db.training_progress.update_one(
        {"restaurant_id": rest_id, "employee_id": emp_id, "course_id": req.course_id, "mission_id": req.mission_id},
        {"$set": {"status": "not_started", "steps_completed": [], "steps_skipped": [], "current_step": None,
                  "time_spent_seconds": 0, "updated_at": utc_now().isoformat()}}
    )

    return {"status": "reset"}
