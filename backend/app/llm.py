import os
from typing import Type, TypeVar, Optional, Any
from pydantic import BaseModel, ValidationError
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from dotenv import load_dotenv
import pathlib

# Try loading from current dir, then parent
load_dotenv()
env_path = pathlib.Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

T = TypeVar("T", bound=BaseModel)

class LLMClient:
    def __init__(self):
        # Determine provider
        self.provider = os.getenv("LLM_PROVIDER", "google").lower()
        
        if self.provider == "google":
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                print("CRITICAL WARNING: GOOGLE_API_KEY not found. LLM features will not work.")
                return
                
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-flash-latest",
                    google_api_key=api_key,
                    temperature=0.7,
                    convert_system_message_to_human=True
                )
            except Exception as e:
                print(f"Error initializing Gemini: {e}")
                
        elif self.provider == "ollama":
            # Local Ollama support
            # Requires `ollama pull llama3` (or other model) to be run locally first
            model_name = os.getenv("OLLAMA_MODEL", "llama3")
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            
            try:
                from langchain_ollama import ChatOllama
                self.llm = ChatOllama(
                    model=model_name,
                    base_url=base_url,
                    temperature=0.7
                )
                print(f"Initialized Ollama with model: {model_name}")
            except ImportError:
                print("Error: langchain-ollama not installed. Run `pip install langchain-ollama`.")
            except Exception as e:
                print(f"Error initializing Ollama: {e}")
        
        else:
            print(f"Unknown LLM_PROVIDER: {self.provider}. specific 'google' or 'ollama'.")

    def generate_structured(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        response_model: Type[T],
        retries: int = 2
    ) -> T:
        """
        Generates a structured response complying with response_model.
        Retries on validation error.
        """
        if not self.llm:
            raise Exception("LLM Client not initialized. Check GOOGLE_API_KEY.")

        parser = PydanticOutputParser(pydantic_object=response_model)
        
        # We append format instructions to the user prompt usually, or system.
        # LangChain's PydanticOutputParser provides get_format_instructions()
        
        from langchain_core.messages import SystemMessage, HumanMessage

        full_system_prompt = f"{system_prompt}\n\nIMPORTANT: You must output valid JSON matching the schema below.\n{parser.get_format_instructions()}"
        
        # Use simple ChatPromptTemplate from messages directly to avoid template parsing of '{' in JSON schema
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=full_system_prompt),
            HumanMessage(content=user_prompt)
        ])
        
        chain = prompt | self.llm
        
        last_error = None
        for attempt in range(retries + 1):
            try:
                result = chain.invoke({}) # Arguments embedded in prompt already via from_messages? 
                # Wait, prompt uses variables {system_prompt} etc. but they were f-stringed above.
                # prompt was created with `from_messages([SystemMessage(content=full_system_prompt), ...])`
                # So we just invoke with empty dict or any input.
                
                if hasattr(result, 'content'):
                    text_output = result.content
                    if isinstance(text_output, list):
                        # Some versions return list of content blocks
                        parts = []
                        for item in text_output:
                            if isinstance(item, str):
                                parts.append(item)
                            elif isinstance(item, dict):
                                parts.append(item.get("text", ""))
                            elif hasattr(item, 'text'):
                                parts.append(item.text)
                            else:
                                parts.append(str(item))
                        text_output = "".join(parts)
                else:
                    text_output = str(result)
                
                # Parse
                # Sometimes LLM puts markdown code blocks ```json ... ```
                cleaned_text = text_output.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:]
                if cleaned_text.startswith("```"):
                    cleaned_text = cleaned_text[3:]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3]
                
                parsed_obj = parser.parse(cleaned_text)
                return parsed_obj
                
            except Exception as e:
                print(f"LLM Structure Attempt {attempt+1} failed: {e}")
                last_error = e
                # In a real robust system, we might feed the error back to the LLM to correct itself
                # For MVP, simple retry might work if it was just bad luck, but often needs feedback.
                # Let's simple retry for now.
        
        raise last_error or Exception("Failed to generate structured output")

llm_client = LLMClient()
