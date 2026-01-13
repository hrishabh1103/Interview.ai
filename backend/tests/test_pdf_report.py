import os
from app.services.report import generate_report_pdf
from app.models import FinalReport

def test_generate_pdf_report():
    # Mock Data
    long_text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 50
    
    report = FinalReport(
        overall_score=8,
        category_scores={
            "correctness": 8,
            "depth": 7,
            "communication": 9,
            "structure": 8
        },
        strengths=["Great communication skills", "Clear voice", "Good structure"],
        weaknesses=["Could go deeper into system design", "Missed edge cases"],
        improvement_plan_7_days=[
            f"Day {i}: {long_text}" for i in range(1, 8)
        ],
        improved_answers=[
            {
                "question": "Explain consistency patterns.",
                "original_answer": "I think it is about databases.",
                "feedback": "Too shallow.",
                "ideal_answer": long_text
            },
            {
                "question": "Design a rate limiter.",
                "original_answer": "Use Redis.",
                "feedback": "Explain algorithm.",
                "ideal_answer": long_text * 2
            }
        ]
    )
    
    session_id = "test_pdf_gen_123"
    transcript = [
        {"role": "interviewer", "text": "Hello"},
        {"role": "candidate", "text": "Hi there"},
        {"role": "interviewer", "text": long_text},
        {"role": "candidate", "text": long_text}
    ]
    
    # Run Generation
    pdf_path = generate_report_pdf(report, session_id, transcript)
    
    # Verification
    assert os.path.exists(pdf_path)
    file_size = os.path.getsize(pdf_path)
    print(f"Generated PDF size: {file_size} bytes")
    
    assert file_size > 1000 # Should be substantial
    
    # Check cleanup (optional, or manual)
    # os.remove(pdf_path)

if __name__ == "__main__":
    test_generate_pdf_report()
