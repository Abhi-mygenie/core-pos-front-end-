# CR-053: Course and Mission models
from pydantic import BaseModel, Field
from typing import List, Optional
from .base import BaseDocument, utc_now


class StepValidation(BaseModel):
    type: str  # url_contains, element_visible, click_target, input_not_empty, toast_appeared, wait_seconds
    value: str


class MissionStep(BaseModel):
    step_id: str
    order: int
    instruction: str
    detail: Optional[str] = None
    target: Optional[str] = None  # CSS selector e.g. [data-testid='sidebar-menu']
    action: str  # click, input, select, observe, scroll, navigate
    validate: StepValidation
    hint: Optional[str] = None
    fallback_hint: Optional[str] = None
    auto_advance_seconds: Optional[int] = None
    expected_value: Optional[str] = None
    highlight_style: str = "spotlight"  # spotlight, outline, arrow
    tooltip_position_preference: Optional[str] = None  # bottom, top, right, left


class CourseModel(BaseDocument):
    course_id: str
    version: int = 1
    title: str
    description: str
    icon: str
    cover_color: str = "#329937"
    target_roles: List[str] = []
    status: str = "active"  # active, coming_soon, archived, draft
    display_order: int = 1
    estimated_time_minutes: int = 30
    difficulty: str = "beginner"  # beginner, intermediate, advanced
    mission_count: int = 0
    prerequisites: List[str] = []
    tags: List[str] = []
    created_at: str = Field(default_factory=lambda: utc_now().isoformat())
    updated_at: str = Field(default_factory=lambda: utc_now().isoformat())


class MissionModel(BaseDocument):
    mission_id: str
    course_id: str
    version: int = 1
    title: str
    description: str
    display_order: int = 1
    difficulty: str = "beginner"
    estimated_time_minutes: int = 5
    tags: List[str] = []
    prerequisite_mission: Optional[str] = None
    allows_skip: bool = True
    practice_mode: bool = False
    status: str = "active"
    steps: List[MissionStep] = []
    step_count: int = 0
    created_at: str = Field(default_factory=lambda: utc_now().isoformat())
    updated_at: str = Field(default_factory=lambda: utc_now().isoformat())
