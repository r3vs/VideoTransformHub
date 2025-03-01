
#!/bin/bash
# Install Flask if not already installed
pip install flask beautifulsoup4 requests

# Create needed directories
mkdir -p output/{logs,processed,plans,moodle}

# Start the Flask server
python app.py
