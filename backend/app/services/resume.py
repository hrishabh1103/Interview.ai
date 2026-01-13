import io
from pypdf import PdfReader

def parse_resume_pdf(file_content: bytes) -> str:
    """
    Extracts text from a PDF file content.
    """
    try:
        reader = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        # Safety / Cleanup
        # If text is too long (e.g. > 20k chars), truncate it to avoid context window issues/abuse
        max_chars = 20000 
        if len(text) > max_chars:
            text = text[:max_chars] + "\n[TRUNCATED]"
            
        return text.strip()
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""
