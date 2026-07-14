# CR-053: Progress and Activity models
from pydantic import BaseModel, Field
from typing import List, Optional
from .base import BaseDocument, utc_now


class ProgressModel(BaseDocument):
    restaurant_id: int
    employee_id: int
    employee_name: str = ""
    employee_role: str = ""
    course_id: str
    mission_id: str
    status: str = "not_started"  # not_started, in_progress, completed, skipped
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    skipped_at: Optional[str] = None
    last_active_at: Optional[str] = None
    steps_completed: List[str] = []
    steps_skipped: List[str] = []
    current_step: Optional[str] = None
    attempts: int = 0
    time_spent_seconds: int = 0
    mission_version: int = 1
    created_at: str = Field(default_factory=lambda: utc_now().isoformat())
    updated_at: str = Field(default_factory=lambda: utc_now().isoformat())


class ActivityLogModel(BaseDocument):
    restaurant_id: int
    employee_id: int
    event_type: str  # mission_started, mission_completed, mission_skipped, step_completed, step_skipped
    course_id: str
    mission_id: Optional[str] = None
    step_id: Optional[str] = None
    metadata: dict = {}
    timestamp: str = Field(default_factory=lambda: utc_now().isoformat())


class AssignmentModel(BaseDocument):
    restaurant_id: int
    employee_id: int
    course_id: str
    assigned_by: int
    assigned_at: str = Field(default_factory=lambda: utc_now().isoformat())
    deadline: Optional[str] = None
    status: str = "active"  # active, completed, exempt
    notes: Optional[str] = None


class RestaurantConfigModel(BaseDocument):
    restaurant_id: int
    restaurant_name: str = ""
    tags: List[str] = []
    enabled_courses: List[dict] = []
    settings: dict = {
        "allow_skip": True,
        "show_training_on_first_login": True,
        "reminder_frequency_days": 3,
        "training_deadline_days": 30,
    }
    created_at: str = Field(default_factory=lambda: utc_now().isoformat())
    updated_at: str = Field(default_factory=lambda: utc_now().isoformat())
