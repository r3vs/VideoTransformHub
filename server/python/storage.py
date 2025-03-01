from typing import List, Dict, Any
import os
import json
from datetime import datetime

async def save_course_materials(course_id: int, materials: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Save course materials and return saved data
    This will be integrated with the existing storage system
    """
    # Create materials directory if it doesn't exist
    materials_dir = os.path.join('uploads', str(course_id))
    os.makedirs(materials_dir, exist_ok=True)
    
    saved_materials = []
    for material in materials:
        # Generate unique filename
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{material['name']}"
        filepath = os.path.join(materials_dir, filename)
        
        # Save content based on type
        if material['type'] == 'file':
            with open(filepath, 'wb') as f:
                f.write(material['content'])
            material['path'] = filepath
            del material['content']  # Remove binary content from response
            
        saved_materials.append(material)
    
    return saved_materials
