import { SessionState, ReportResponse, RoleEnum, DifficultyEnum } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function startSession(
    role: RoleEnum,
    difficulty: DifficultyEnum,
    numQuestions: number,
    resumeFile: File,
    voiceEnabled: boolean
): Promise<SessionState> {
    const formData = new FormData();
    formData.append("role", role);
    formData.append("difficulty", difficulty);
    formData.append("num_questions", numQuestions.toString());
    formData.append("voice_enabled", voiceEnabled.toString());
    formData.append("resume", resumeFile);

    const res = await fetch(`${API_URL}/session/start`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start session");
    }
    return res.json();
}

export async function submitAnswer(
    sessionId: string,
    text: string
): Promise<SessionState> {
    const res = await fetch(`${API_URL}/session/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    });

    if (!res.ok) {
        throw new Error("Failed to submit answer");
    }
    return res.json();
}

export async function endSession(sessionId: string): Promise<void> {
    await fetch(`${API_URL}/session/${sessionId}/end`, {
        method: "POST",
    });
}

export async function getSessionState(sessionId: string): Promise<SessionState> {
    const res = await fetch(`${API_URL}/session/${sessionId}/state`);
    if (!res.ok) throw new Error("Failed to get state");
    return res.json();
}

export async function getReport(sessionId: string): Promise<ReportResponse> {
    const res = await fetch(`${API_URL}/session/${sessionId}/report`);
    if (!res.ok) throw new Error("Failed to get report");
    return res.json();
}


export function getReportPdfUrl(sessionId: string): string {
    return `${API_URL}/session/${sessionId}/report.pdf`;
}

// --- Voice ---

export async function getVoiceStatus(): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/voice/status`);
        if (!res.ok) return false;
        const data = await res.json();
        return !!data.enabled;
    } catch {
        return false;
    }
}

export async function synthesizeSpeech(text: string): Promise<Blob> {
    const res = await fetch(`${API_URL}/speech/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    });

    if (!res.ok) {
        throw new Error("TTS failed");
    }

    // Return audio blob
    return res.blob();
}
