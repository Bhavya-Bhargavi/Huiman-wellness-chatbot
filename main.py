import os
import json
import numpy as np
import faiss
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

# NEW IMPORTS FOR CHUNKING
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
embedder = SentenceTransformer('all-MiniLM-L6-v2')

# Add this function instead:
def manual_split_text(text, chunk_size=500):
    # Splits text into chunks of 500 characters
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

# Then, where you load your file, change it to:
with open("wellness_knowledge.txt", "r", encoding="utf-8") as f:
    raw_text = f.read()
knowledge_doc = manual_split_text(raw_text)

# Create FAISS Index from the chunks
embeddings = embedder.encode(knowledge_doc)
index = faiss.IndexFlatL2(embeddings.shape[1])
index.add(np.array(embeddings).astype('float32'))

# --- DATA MODELS ---
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # 1. Vector Search
        query_vector = embedder.encode([request.message])
        distances, indices = index.search(np.array(query_vector).astype('float32'), k=1)
        dist_score = float(distances[0][0])
        
        is_match = dist_score < 1.3 
        
        # 2. Set Instructions based on match
        if is_match:
            context = knowledge_doc[indices[0][0]]
            instruction = f"The user is asking about a personal record. Use this: {context}."
        else:
            instruction = "The user is talking about moods. Be a helpful wellness assistant."

        # 3. Groq Call - STRICT JSON INSTRUCTION
        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system", 
                    "content": (
                        f"You are a wellness bot. {instruction} "
                        "IMPORTANT: You MUST return a JSON object with exactly these keys: "
                        "'summary' (your main response), 'mood', and 'energy_score' (1-10)."
                    )
                },
                {"role": "user", "content": request.message}
            ],
            response_format={"type": "json_object"}
        )

        # Convert AI string to Python Dictionary
        ai_json = json.loads(chat_completion.choices[0].message.content)
        
        # LOGGING for you to check terminal
        print(f"AI RESPONSE: {ai_json}")

        return {"data": {
            **ai_json, 
            "is_personal": is_match  # Sends True if the vector DB was used
        }}

    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")
        # If something fails, send a safe fallback object so React doesn't crash
        return {"data": {"summary": "I'm having trouble processing that right now.", "mood": "Neutral", "energy_score": 5}}