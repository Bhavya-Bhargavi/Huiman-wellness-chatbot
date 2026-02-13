from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Standard CORS setup for your React UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use Groq for 2026's best free-tier performance
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a wellness assistant. Analyze the user's input and "
                        "return ONLY a JSON object with these EXACT keys: "
                        '{"mood": "string", "energy_score": number, "summary": "string"}. '
                        "Do not include any other text."
                    )
                },
                {"role": "user", "content": request.message}
            ],
            response_format={"type": "json_object"}
        )

        # Parse the string output into a real JSON object for React
        result_string = chat_completion.choices[0].message.content
        return {"data": json.loads(result_string)}

    except Exception as e:
        print(f"Groq Error: {e}")
        return {"error": str(e)}

# For Vercel serverless - the app is automatically called
# For local development: uvicorn api/index.py:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)