from fpdf import FPDF
from ..models import FinalReport

class PDFReport(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 15)
        self.cell(0, 10, 'Interviewer.AI - Session Report', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_pdf_report(report: FinalReport) -> bytes:
    pdf = PDFReport()
    pdf.add_page()
    
    # Helper for safe multi_cell
    def safe_multi_cell(text):
        # Handle unicode
        text = text.encode('latin-1', 'replace').decode('latin-1')
        
        # Calculate effective page width manually to avoid "Not enough space" error
        # standard A4 is 210mm. Default margins are 1cm (10mm).
        # We can also use pdf.epw if available in fpdf2, or pdf.w - pdf.l_margin - pdf.r_margin
        effective_width = pdf.w - pdf.l_margin - pdf.r_margin
        if effective_width <= 0:
            effective_width = 190 # Fallback default
            
        pdf.multi_cell(effective_width, 6, text)

    # Overall Score
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, f"Overall Score: {report.overall_score}/10", 0, 1)
    pdf.ln(5)
    
    # Category Scores
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Category Breakdown:", 0, 1)
    pdf.set_font("Helvetica", "", 11)
    for cat, score in report.category_scores.items():
        pdf.cell(0, 7, f"- {cat}: {score}/10", 0, 1)
    pdf.ln(5)
    
    # Strengths
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Strengths:", 0, 1)
    pdf.set_font("Helvetica", "", 10)
    for s in report.strengths:
        safe_multi_cell(f"- {s}")
    pdf.ln(5)
    
    # Weaknesses
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Areas for Improvement:", 0, 1)
    pdf.set_font("Helvetica", "", 10)
    for w in report.weaknesses:
        safe_multi_cell(f"- {w}")
    pdf.ln(5)
    
    # 7-Day Plan
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "7-Day Improvement Plan:", 0, 1)
    pdf.set_font("Helvetica", "", 10)
    for item in report.improvement_plan_7_days:
        safe_multi_cell(f"- {item}")
    pdf.ln(5)
    
    # Improved Answers
    if report.improved_answers:
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 10, "Analysis of Weakest Questions:", 0, 1)
        pdf.ln(2)
        
        for item in report.improved_answers:
            for k, v in item.items():
                pdf.set_font("Helvetica", "B", 10)
                # Check for "Improved Ideal Answer" key which is long
                safe_multi_cell(f"{k}:")
                pdf.set_font("Helvetica", "", 10)
                safe_multi_cell(f"{v}")
                pdf.ln(2)
            pdf.ln(5)
            
    return pdf.output()
