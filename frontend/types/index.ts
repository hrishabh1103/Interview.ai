export type RoleEnum = "SDE1" | "Product Manager" | "Marketing Manager";
export type DifficultyEnum = "Easy" | "Medium" | "Hard";

export interface Question {
  id: string;
  text: string;
  topic: string;
  expected_points: string[];
  difficulty: DifficultyEnum;
  time_limit_sec: number;
}

export interface Answer {
  question_id: string;
  text: string;
}

export interface Evaluation {
  question_id: string;
  correctness_score: number;
  depth_score: number;
  structure_score: number;
  communication_score: number;
  missing_points: string[];
  feedback_text: string;
  followup_needed: boolean;
}

export interface Message {
  role: "interviewer" | "candidate" | "system";
  content: string;
}

export interface SessionState {
  session_id: string;
  current_question: Question | null;
  is_followup: boolean;
  progress: string;
  messages: Message[];
  scores: Evaluation | null;
  interview_complete: boolean;
  report_available: boolean;
}

export interface FinalReport {
  overall_score: number;
  category_scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  improvement_plan_7_days: string[];
  improved_answers: Record<string, string>[];
}

export interface ReportResponse {
  report: FinalReport;
}

export interface VoiceOption {
  short_name: string;
  gender: string;
  locale: string;
  friendly_name: string;
}
