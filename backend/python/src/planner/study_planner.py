
import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
import datetime
import random

from src.config.config import settings

logger = logging.getLogger(__name__)

class StudyPlanner:
    """
    Generate personalized study plans that incorporate exam dates,
    calendar commitments, and wellness activities.
    """
    
    def __init__(self):
        self.output_dir = Path(settings.OUTPUT_PATH) / "plans"
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def _generate_pomodoro_sessions(self, duration_hours: float) -> List[Dict[str, Any]]:
        """
        Generate Pomodoro sessions for a given study duration.
        
        Args:
            duration_hours: Total hours to study
            
        Returns:
            List of Pomodoro sessions
        """
        sessions = []
        
        # Standard Pomodoro: 25 min work, 5 min break, 15 min long break after 4 sessions
        pomodoro_count = int(duration_hours * 60 / 30)  # Approximate number of pomodoros
        
        for i in range(pomodoro_count):
            sessions.append({
                "type": "study",
                "duration_minutes": 25,
                "technique": "focused_work"
            })
            
            # Add break
            if (i + 1) % 4 == 0:
                sessions.append({
                    "type": "break",
                    "duration_minutes": 15,
                    "technique": "long_break"
                })
            else:
                sessions.append({
                    "type": "break",
                    "duration_minutes": 5,
                    "technique": "short_break"
                })
        
        return sessions
    
    def _generate_wellness_activities(self, count: int) -> List[Dict[str, Any]]:
        """
        Generate wellness activities.
        
        Args:
            count: Number of activities to generate
            
        Returns:
            List of wellness activities
        """
        activities = [
            {"type": "wellness", "activity": "meditation", "duration_minutes": 10},
            {"type": "wellness", "activity": "stretching", "duration_minutes": 15},
            {"type": "wellness", "activity": "walk", "duration_minutes": 20},
            {"type": "wellness", "activity": "hydration", "duration_minutes": 5},
            {"type": "wellness", "activity": "healthy_snack", "duration_minutes": 15},
            {"type": "wellness", "activity": "power_nap", "duration_minutes": 20},
            {"type": "wellness", "activity": "journaling", "duration_minutes": 15},
            {"type": "wellness", "activity": "deep_breathing", "duration_minutes": 5}
        ]
        
        return random.sample(activities, min(count, len(activities)))
    
    def create_study_plan(
        self,
        course_name: str,
        exam_date: datetime.date,
        study_hours_per_day: float = 4.0,
        existing_commitments: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a personalized study plan for a course.
        
        Args:
            course_name: Name of the course
            exam_date: Date of the exam
            study_hours_per_day: Hours to study per day (default 4)
            existing_commitments: List of existing commitments from calendar
            
        Returns:
            Study plan dictionary
        """
        if existing_commitments is None:
            existing_commitments = []
            
        today = datetime.date.today()
        days_until_exam = (exam_date - today).days
        
        if days_until_exam <= 0:
            logger.warning(f"Exam date {exam_date} is in the past or today")
            return {
                "error": "Exam date must be in the future",
                "course_name": course_name,
                "exam_date": str(exam_date)
            }
        
        # Create daily plans
        daily_plans = []
        
        for day_offset in range(1, days_until_exam + 1):
            current_date = today + datetime.timedelta(days=day_offset)
            
            # Generate pomodoro sessions
            study_sessions = self._generate_pomodoro_sessions(study_hours_per_day * 0.8)  # 80% for study
            
            # Generate wellness activities (roughly 20% of the time)
            wellness_count = max(1, int(study_hours_per_day * 0.2 / 0.25))  # ~15min per activity
            wellness_activities = self._generate_wellness_activities(wellness_count)
            
            # Combine and organize sessions
            daily_plan = {
                "date": current_date.isoformat(),
                "available_hours": study_hours_per_day,
                "sessions": study_sessions + wellness_activities
            }
            
            daily_plans.append(daily_plan)
        
        # Create overall plan
        study_plan = {
            "course_name": course_name,
            "exam_date": exam_date.isoformat(),
            "created_at": datetime.datetime.now().isoformat(),
            "days_until_exam": days_until_exam,
            "total_available_study_days": len(daily_plans),
            "total_study_hours": sum(day["available_hours"] for day in daily_plans),
            "daily_plans": daily_plans
        }
        
        return study_plan
    
    def save_study_plan(self, study_plan: Dict[str, Any], output_path: Optional[Path] = None) -> Path:
        """
        Save study plan to file.
        
        Args:
            study_plan: The study plan to save
            output_path: Path to save to (optional)
            
        Returns:
            Path where study plan was saved
        """
        if output_path is None:
            course_name = study_plan.get("course_name", "unknown").lower().replace(" ", "_")
            output_path = self.output_dir / f"{course_name}_study_plan.json"
            
        # Create JSON file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(study_plan, f, indent=2)
            
        logger.info(f"Study plan saved to {output_path}")
        
        # Create Markdown summary for easier reading
        md_path = output_path.with_suffix(".md")
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(f"# Study Plan for {study_plan.get('course_name')}\n\n")
            f.write(f"**Exam Date:** {study_plan.get('exam_date')}\n")
            f.write(f"**Days Until Exam:** {study_plan.get('days_until_exam')}\n")
            f.write(f"**Total Study Hours:** {study_plan.get('total_study_hours')}\n\n")
            
            f.write("## Daily Schedule\n\n")
            
            for day in study_plan.get("daily_plans", []):
                f.write(f"### {day.get('date')}\n\n")
                f.write(f"Available Hours: {day.get('available_hours')}\n\n")
                
                f.write("**Sessions:**\n\n")
                
                for session in day.get("sessions", []):
                    if session.get("type") == "study":
                        f.write(f"- Study: {session.get('duration_minutes')} minutes ({session.get('technique')})\n")
                    elif session.get("type") == "break":
                        f.write(f"- Break: {session.get('duration_minutes')} minutes ({session.get('technique')})\n")
                    elif session.get("type") == "wellness":
                        f.write(f"- Wellness: {session.get('activity')}, {session.get('duration_minutes')} minutes\n")
                        
                f.write("\n")
        
        return output_path
