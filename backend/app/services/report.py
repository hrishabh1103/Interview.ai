from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, ListFlowable, ListItem
from reportlab.lib.units import inch
from datetime import datetime

from app.models import FinalReport

def generate_report_pdf(final_report: FinalReport, session_id: str, transcript: list) -> str:
    """
    Generates a PDF report using ReportLab.
    Returns the file path to the generated PDF.
    """
    output_path = f"/tmp/report_{session_id}.pdf"
    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Justify', alignment=1))
    
    story = []

    # 1. Header
    title = f"Interviewer.AI Report"
    date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    story.append(Paragraph(title, styles["Title"]))
    story.append(Paragraph(f"Session ID: {session_id}", styles["Normal"]))
    story.append(Paragraph(f"Date: {date_str}", styles["Normal"]))
    story.append(Spacer(1, 12))

    # 2. Overall Score
    story.append(Paragraph(f"Overall Score: {final_report.overall_score}/10", styles["Heading2"]))
    story.append(Spacer(1, 12))

    # Category Scores Table
    data = [["Category", "Score"]]
    for category, score in final_report.category_scores.items():
        data.append([category.replace("_", " ").title(), f"{score}/10"])
    
    t = Table(data, colWidths=[4*inch, 2*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(t)
    story.append(Spacer(1, 24))

    # 3. Strengths
    story.append(Paragraph("Strengths", styles["Heading2"]))
    bullets = [ListItem(Paragraph(s, styles["Normal"])) for s in final_report.strengths]
    story.append(ListFlowable(bullets, bulletType='bullet', start='circle'))
    story.append(Spacer(1, 12))

    # 4. Weaknesses & Improvement Areas
    story.append(Paragraph("Areas for Improvement", styles["Heading2"]))
    bullets = [ListItem(Paragraph(w, styles["Normal"])) for w in final_report.weaknesses]
    story.append(ListFlowable(bullets, bulletType='bullet', start='circle'))
    story.append(Spacer(1, 12))

    # 5. 7-Day Improvement Plan
    story.append(Paragraph("7-Day Improvement Plan", styles["Heading2"]))
    bullets = [ListItem(Paragraph(day, styles["Normal"])) for day in final_report.improvement_plan_7_days]
    story.append(ListFlowable(bullets, bulletType='bullet', start='1'))
    story.append(PageBreak())

    # 6. Improved Answers / Examples
    if final_report.improved_answers:
        story.append(Paragraph("Feedback on Specific Answers", styles["Heading2"]))
        for idx, item in enumerate(final_report.improved_answers, 1):
             # Try to extract key fields if it's a dict, or just dump string if simple
             # Expected format: {"question": "...", "feedback": "...", "ideal_answer": "..."}
             # But the model defines it as Record<string, string>, so keys might vary.
             # We'll iterate the keys.
             q_text = item.get("question", f"Question {idx}")
             story.append(Paragraph(f"<b>{q_text}</b>", styles["Heading3"]))
             
             for k, v in item.items():
                 if k == "question": continue
                 story.append(Paragraph(f"<b>{k.replace('_', ' ').title()}:</b>", styles["Normal"]))
                 story.append(Paragraph(str(v), styles["Normal"]))
                 story.append(Spacer(1, 6))
             
             story.append(Spacer(1, 12))
        
        story.append(PageBreak())

    # 7. Transcript Loading
    # (Optional summary or short transcript could go here)
    if transcript:
        story.append(Paragraph("Session Transcript", styles["Heading2"]))
        for msg in transcript:
             role = msg.get("role", "unknown").upper()
             content = msg.get("content", "")
             story.append(Paragraph(f"<b>{role}:</b> {content}", styles["Normal"]))
             story.append(Spacer(1, 6))

    doc.build(story)
    return output_path
