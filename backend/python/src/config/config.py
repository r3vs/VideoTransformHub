
import os
from pathlib import Path
from typing import Dict, Any, Optional

class Settings:
    # General settings
    APP_ENV: str = os.getenv("APP_ENV", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Moodle settings
    MOODLE_URL: str = os.getenv("MOODLE_URL", "")
    MOODLE_USERNAME: str = os.getenv("MOODLE_USERNAME", "")
    MOODLE_PASSWORD: str = os.getenv("MOODLE_PASSWORD", "")
    
    # Path settings
    LOCAL_STORAGE_PATH: Path = Path(os.getenv("LOCAL_STORAGE_PATH", "data"))
    OUTPUT_PATH: Path = Path(os.getenv("OUTPUT_PATH", "output"))
    
    # Source reliability hierarchy
    SOURCE_RELIABILITY: Dict[str, int] = {
        "moodle": 3,  # Highest priority
        "external_research": 2,
        "personal": 1  # Lowest priority
    }
    
    def __init__(self):
        # Ensure directories exist
        self.LOCAL_STORAGE_PATH.mkdir(parents=True, exist_ok=True)
        self.OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (self.OUTPUT_PATH / "moodle").mkdir(parents=True, exist_ok=True)
        (self.OUTPUT_PATH / "processed").mkdir(parents=True, exist_ok=True)
        (self.OUTPUT_PATH / "plans").mkdir(parents=True, exist_ok=True)
        (self.OUTPUT_PATH / "logs").mkdir(parents=True, exist_ok=True)

settings = Settings()
