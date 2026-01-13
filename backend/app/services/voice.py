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

async def synthesize_speech(text: str) -> bytes:
    """
    Converts text to MP3 audio bytes using edge-tts (Microsoft Edge Neural Voices).
    """
    # Use a high quality English voice
    VOICE = "en-US-ChristopherNeural" 
    
    communicate = edge_tts.Communicate(text, VOICE)
    
    # edge-tts writes to stream. We want bytes.
    # We can use iterate over the stream of the communicate object
    
    mp3_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_data += chunk["data"]
            
    return mp3_data
