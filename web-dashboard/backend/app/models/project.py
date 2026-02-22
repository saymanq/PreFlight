"""Pydantic models for project operations."""

from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime


class Constraints(BaseModel):
    """Project constraints for architecture planning."""
    budgetLevel: str = "medium"
    teamSize: int = 2
    timeline: str = "1month"
    trafficExpectation: str = "medium"
    dataVolume: str = "medium"
    uptimeTarget: float = 99.0
    regionCount: int = 1
    devExperienceGoal: str = "balanced"
    dataSensitivity: str = "low"
    preferredProviders: List[str] = Field(default_factory=list)
    avoidProviders: List[str] = Field(default_factory=list)


class GraphData(BaseModel):
    """Architecture graph data."""
    nodes: List[Any] = Field(default_factory=list)
    edges: List[Any] = Field(default_factory=list)


class ProjectCreate(BaseModel):
    """Request model for creating a new project."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    ideaPrompt: Optional[str] = None
    startFrom: str = "blank"
    constraints: Optional[Constraints] = None
    graph: Optional[GraphData] = None


class ProjectUpdate(BaseModel):
    """Request model for updating project metadata."""
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    """Full project response model."""
    projectId: str
    name: str
    description: Optional[str] = None
    ideaPrompt: Optional[str] = None
    constraints: Constraints
    graph: GraphData = Field(default_factory=GraphData)
    scores: Optional[Any] = None
    lintIssues: Optional[List[Any]] = None
    nodeCount: int = 0
    overallScore: Optional[float] = None
    lintErrorCount: int = 0
    lintWarningCount: int = 0
    archived: bool = False
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class ProjectListItem(BaseModel):
    """Lightweight project for list view."""
    _id: str
    name: str
    description: Optional[str] = None
    nodeCount: int = 0
    overallScore: Optional[float] = None
    lintErrorCount: int = 0
    lintWarningCount: int = 0
    updatedAt: str
    createdAt: str

    class Config:
        from_attributes = True
