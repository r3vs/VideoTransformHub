
import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
import json
import datetime

from src.config.config import settings

logger = logging.getLogger(__name__)

class ContentProcessor:
    """
    Process and transform content from various sources into structured formats
    like notes, concept maps, quizzes, and flashcards.
    """
    
    def __init__(self):
        self.output_dir = Path(settings.OUTPUT_PATH) / "processed"
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def process_text_file(self, file_path: Path, source_type: str) -> Dict[str, Any]:
        """
        Process a text file into structured content.
        
        Args:
            file_path: Path to the file
            source_type: Type of source (moodle, external_research, personal)
            
        Returns:
            Dictionary with processed content
        """
        try:
            # Read the file content
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text_content = f.read()
            
            # Simple processing logic
            paragraphs = text_content.split('\n\n')
            summary = paragraphs[0] if paragraphs else "No content available"
            
            # Extract key points (this is a simplified version)
            key_points = []
            for para in paragraphs[:5]:  # Take first 5 paragraphs
                sentences = para.split('.')
                for sentence in sentences:
                    # Simple heuristic: sentences with keywords might be key points
                    keywords = ['important', 'key', 'significant', 'essential', 'crucial']
                    if any(keyword in sentence.lower() for keyword in keywords) and len(sentence) > 20:
                        key_points.append(sentence.strip())
            
            # If no key points found with keywords, take first sentence of each paragraph
            if not key_points and len(paragraphs) > 1:
                key_points = [p.split('.')[0].strip() for p in paragraphs[1:4] if p]
            
            processed_content = {
                "original_file": str(file_path),
                "source_type": source_type,
                "reliability_score": settings.SOURCE_RELIABILITY.get(source_type, 0),
                "content": {
                    "summary": summary,
                    "key_points": key_points[:3],  # Limit to 3 key points
                    "details": text_content[:500] + ("..." if len(text_content) > 500 else "")
                },
                "metadata": {
                    "processed_at": str(datetime.datetime.now()),
                    "word_count": len(text_content.split())
                }
            }
            
            return processed_content
            
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
            return {
                "error": str(e),
                "original_file": str(file_path),
                "source_type": source_type
            }
    
    def generate_notes(self, content: Dict[str, Any], output_path: Optional[Path] = None) -> Path:
        """
        Generate formatted notes from processed content.
        
        Args:
            content: Processed content dictionary
            output_path: Path to save the notes (optional)
            
        Returns:
            Path to the generated notes file
        """
        if output_path is None:
            filename = Path(content.get("original_file", "unknown")).stem
            output_path = self.output_dir / f"{filename}_notes.md"
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(f"# Notes: {output_path.stem}\n\n")
                f.write(f"## Summary\n\n{content.get('content', {}).get('summary', '')}\n\n")
                
                f.write("## Key Points\n\n")
                for point in content.get('content', {}).get('key_points', []):
                    f.write(f"- {point}\n")
                
                f.write("\n## Details\n\n")
                f.write(content.get('content', {}).get('details', ''))
                
                f.write("\n\n## Source Information\n\n")
                f.write(f"- Source: {content.get('source_type', 'Unknown')}\n")
                f.write(f"- Reliability Score: {content.get('reliability_score', 0)}\n")
                f.write(f"- Original File: {content.get('original_file', 'Unknown')}\n")
            
            logger.info(f"Generated notes saved to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error generating notes: {e}")
            error_path = self.output_dir / "error_notes.md"
            with open(error_path, 'w', encoding='utf-8') as f:
                f.write(f"# Error Generating Notes\n\n{str(e)}")
            return error_path
