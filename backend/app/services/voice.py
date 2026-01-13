import io
import edge_tts

# Edge-TTS is free and requires no API key.
# STT is now handled by the frontend (Web Speech API).

_VOICE_ENABLED = True

def check_voice_availability() -> bool:
    return _VOICE_ENABLED

async def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Deprecated in favor of Client-Side Web Speech API.
    If called, returns error instructions.
    """
    raise Exception("STT is now client-side. Do not call this endpoint.")

async def synthesize_speech(text: str, voice_name: str = "en-US-ChristopherNeural", rate: str = "+0%", pitch: str = "+0Hz") -> bytes:
    """
    Converts text to MP3 audio bytes using edge-tts (Microsoft Edge Neural Voices).
    Supports custom voice, rate, and pitch.
    """
    communicate = edge_tts.Communicate(text, voice_name, rate=rate, pitch=pitch)
    
    mp3_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_data += chunk["data"]
            
    return mp3_data

def get_available_voices():
    # Helper to return supported list
    return [
        {"short_name": "en-US-ChristopherNeural", "gender": "Male", "locale": "en-US", "friendly_name": "Christopher (US)"},
        {"short_name": "en-US-AriaNeural", "gender": "Female", "locale": "en-US", "friendly_name": "Aria (US)"},
        {"short_name": "en-US-GuyNeural", "gender": "Male", "locale": "en-US", "friendly_name": "Guy (US)"},
        {"short_name": "en-US-JennyNeural", "gender": "Female", "locale": "en-US", "friendly_name": "Jenny (US)"},
        {"short_name": "en-US-MichelleNeural", "gender": "Female", "locale": "en-US", "friendly_name": "Michelle (US)"},
        {"short_name": "en-IN-PrabhatNeural", "gender": "Male", "locale": "en-IN", "friendly_name": "Prabhat (India)"},
        {"short_name": "en-IN-NeerjaNeural", "gender": "Female", "locale": "en-IN", "friendly_name": "Neerja (India)"},
        {"short_name": "en-GB-RyanNeural", "gender": "Male", "locale": "en-GB", "friendly_name": "Ryan (UK)"},
        {"short_name": "en-GB-SoniaNeural", "gender": "Female", "locale": "en-GB", "friendly_name": "Sonia (UK)"},
        {"short_name": "en-AU-NatashaNeural", "gender": "Female", "locale": "en-AU", "friendly_name": "Natasha (AU)"},
        {"short_name": "en-AU-WilliamNeural", "gender": "Male", "locale": "en-AU", "friendly_name": "William (AU)"},
    ]
