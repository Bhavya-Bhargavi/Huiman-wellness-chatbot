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

load_dotenv()

app = FastAPI()

# Enable CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
embedder = SentenceTransformer('all-MiniLM-L6-v2')

# 1. Load Knowledge Base
# For the demo, using a list. You can swap this with load_from_txt() later.
knowledge_doc = [
    "Bhavya's favorite relaxation is 10 minutes of deep breathing.",
    "The first date was at 'The Green Cafe' on June 12th where they ate avocado toast.",
    "Bhavya loves Matcha Lattes with oat milk and absolutely hates cold coffee.",
    "The most energetic memory was the hiking trip to Blue Mountain in May 2025."
]

embeddings = embedder.encode(knowledge_doc)
index = faiss.IndexFlatL2(embeddings.shape[1])
index.add(np.array(embeddings).astype('float32'))

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # 1. Search the Vector DB
        query_vector = embedder.encode([request.message])
        distances, indices = index.search(np.array(query_vector).astype('float32'), k=1)
        
        is_match = distances[0][0] < 1.1 
        
        # 2. Hybrid Logic: If it's a mood, be helpful. If it's a fact search, be strict.
        if is_match:
            context = knowledge_doc[indices[0][0]]
            instruction = (
            f"The user is asking about a personal record. Answer ONLY using this: {context}. "
                "If the question is unrelated to this context, do not answer it."
            )
        else:
            # If no match, check if it's a general wellness conversation
            context = "General Wellness Conversation"
            instruction = (
        "The user is talking about moods or wellness. "
        "RESTRICTION: You are a Wellness Assistant ONLY. If the user asks about celebrities, "
        "politics, sports (like Virat Kohli), or general facts unrelated to wellness, "
        "politely say: 'I am your wellness assistant and I only focus on your health and memories.'"
    )

        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": f"You are a wellness bot. {instruction} Return ONLY JSON with 'summary', 'mood', and 'energy_score'."},
                {"role": "user", "content": request.message}
            ],
            response_format={"type": "json_object"}
        )

        return {"data": json.loads(chat_completion.choices[0].message.content)}

    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))