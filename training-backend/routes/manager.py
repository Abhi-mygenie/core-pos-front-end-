# CR-053: Manager API — overview, employee detail, assign, remind
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from middleware.pos_auth import get_current_employee
from models.base import utc_now

router = APIRouter(prefix="/api/training/manager", tags=["manager"])


class AssignRequest(BaseModel):
    employee_id: int
    course_id: str
    deadline: Optional[str] = None


class RemindRequest(BaseModel):
    employee_id: int
    course_id: Optional[str] = None
    message: Optional[str] = None


@router.get("/overview")
async def staff_overview(employee: dict = Depends(get_current_employee)):
    """Get training progress for all employees in this restaurant."""
    from server import db

    rest_id = employee["restaurant_id"]
    role = employee.get("role", "")

    if role not in ("owner", "manager", "admin"):
        raise HTTPException(status_code=403, detail="Only owner/manager can view staff training")

    # Get all progress docs for this restaurant
    all_progress = await db.training_progress.find(
        {"restaurant_id": rest_id}, {"_id": 0}
    ).to_list(5000)

    # Get all courses for mission counts
    courses = await db.training_courses.find({"status": "active"}, {"_id": 0}).to_list(100)
    course_map = {c["course_id"]: c for c in courses}

    # Group by employee
    employees = {}
    for doc in all_progress:
        eid = doc["employee_id"]
        if eid not in employees:
            employees[eid] = {
                "employee_id": eid,
                "name": doc.get("employee_name", "Unknown"),
                "role": doc.get("employee_role", "staff"),
                "courses": {},
                "last_active": doc.get("last_active_at"),
            }

        cid = doc["course_id"]
        if cid not in employees[eid]["courses"]:
            employees[eid]["courses"][cid] = {"completed": 0, "total": course_map.get(cid, {}).get("mission_count", 0), "skipped": 0, "in_progress": 0}

        status = doc.get("status", "not_started")
        if status == "completed":
            employees[eid]["courses"][cid]["completed"] += 1
        elif status == "skipped":
            employees[eid]["courses"][cid]["skipped"] += 1
        elif status == "in_progress":
            employees[eid]["courses"][cid]["in_progress"] += 1

        # Track latest activity
        if doc.get("last_active_at") and (not employees[eid]["last_active"] or doc["last_active_at"] > employees[eid]["last_active"]):
            employees[eid]["last_active"] = doc["last_active_at"]

    # Compute overall progress per employee
    employee_list = []
    for eid, emp in employees.items():
        total_done = sum(c["completed"] for c in emp["courses"].values())
        total_missions = sum(c["total"] for c in emp["courses"].values())
        overall = (total_done / total_missions * 100) if total_missions > 0 else 0

        # Convert courses dict to list with progress
        course_summaries = {}
        for cid, stats in emp["courses"].items():
            pct = (stats["completed"] / stats["total"] * 100) if stats["total"] > 0 else 0
            course_summaries[cid] = {
                "completed": stats["completed"],
                "total": stats["total"],
                "progress": round(pct, 1),
                "status": "completed" if stats["completed"] == stats["total"] and stats["total"] > 0 else (
                    "in_progress" if stats["completed"] > 0 or stats["in_progress"] > 0 else "not_started"
                ),
            }

        employee_list.append({
            "employee_id": eid,
            "name": emp["name"],
            "role": emp["role"],
            "overall_progress": round(overall, 1),
            "last_active": emp["last_active"],
            "courses": course_summaries,
        })

    # Sort by name
    employee_list.sort(key=lambda x: x["name"])

    # Summary stats
    total_staff = len(employee_list)
    fully_trained = sum(1 for e in employee_list if e["overall_progress"] >= 100)
    avg_progress = (sum(e["overall_progress"] for e in employee_list) / total_staff) if total_staff > 0 else 0
    needs_attention = sum(1 for e in employee_list if e["overall_progress"] < 30)

    return {
        "restaurant_id": rest_id,
        "summary": {
            "total_employees": total_staff,
            "fully_trained": fully_trained,
            "avg_progress": round(avg_progress, 1),
            "needs_attention": needs_attention,
        },
        "employees": employee_list,
        "courses": [{"course_id": c["course_id"], "title": c["title"], "mission_count": c["mission_count"]} for c in courses],
    }


@router.get("/employee/{employee_id}")
async def employee_detail(employee_id: int, employee: dict = Depends(get_current_employee)):
    """Get detailed training progress for a specific employee."""
    from server import db

    rest_id = employee["restaurant_id"]
    role = employee.get("role", "")

    if role not in ("owner", "manager", "admin"):
        raise HTTPException(status_code=403, detail="Only owner/manager can view employee details")

    # Get all progress for this employee
    progress_docs = await db.training_progress.find(
        {"restaurant_id": rest_id, "employee_id": employee_id}, {"_id": 0}
    ).to_list(500)

    if not progress_docs:
        return {"employee_id": employee_id, "courses": [], "activity": []}

    emp_name = progress_docs[0].get("employee_name", "Unknown")
    emp_role = progress_docs[0].get("employee_role", "staff")

    # Get all courses + missions
    courses = await db.training_courses.find({"status": "active"}, {"_id": 0}).to_list(100)
    course_map = {c["course_id"]: c for c in courses}

    # Group progress by course
    course_details = []
    for course in courses:
        cid = course["course_id"]
        missions_progress = [doc for doc in progress_docs if doc["course_id"] == cid]

        # Get mission metadata
        missions = await db.training_missions.find(
            {"course_id": cid, "status": "active"}, {"_id": 0, "steps": 0}
        ).sort("display_order", 1).to_list(100)

        mission_details = []
        for m in missions:
            mid = m["mission_id"]
            mp = next((p for p in missions_progress if p["mission_id"] == mid), None)
            mission_details.append({
                "mission_id": mid,
                "title": m["title"],
                "display_order": m["display_order"],
                "difficulty": m["difficulty"],
                "status": mp["status"] if mp else "not_started",
                "steps_completed": len(mp.get("steps_completed", [])) if mp else 0,
                "total_steps": m.get("step_count", 0),
                "time_spent_seconds": mp.get("time_spent_seconds", 0) if mp else 0,
                "completed_at": mp.get("completed_at") if mp else None,
                "skipped_at": mp.get("skipped_at") if mp else None,
            })

        completed = sum(1 for m in mission_details if m["status"] == "completed")
        total = len(mission_details)
        pct = (completed / total * 100) if total > 0 else 0

        course_details.append({
            "course_id": cid,
            "title": course["title"],
            "icon": course.get("icon", ""),
            "completed": completed,
            "total": total,
            "progress": round(pct, 1),
            "missions": mission_details,
        })

    # Get activity log
    activity = await db.training_activity_log.find(
        {"restaurant_id": rest_id, "employee_id": employee_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(50).to_list(50)

    return {
        "employee_id": employee_id,
        "name": emp_name,
        "role": emp_role,
        "courses": course_details,
        "activity": activity,
    }


@router.post("/assign")
async def assign_course(req: AssignRequest, employee: dict = Depends(get_current_employee)):
    """Assign a course to an employee."""
    from server import db

    rest_id = employee["restaurant_id"]
    now = utc_now().isoformat()

    await db.training_assignments.update_one(
        {"restaurant_id": rest_id, "employee_id": req.employee_id, "course_id": req.course_id},
        {"$set": {
            "assigned_by": employee["employee_id"],
            "assigned_at": now,
            "deadline": req.deadline,
            "status": "active",
        }},
        upsert=True
    )

    return {"status": "assigned", "employee_id": req.employee_id, "course_id": req.course_id}
