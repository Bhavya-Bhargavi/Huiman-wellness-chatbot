import os
import json
import numpy as np
import faiss
from fastapi import FastAPI, HTTPException
from fastapi import UploadFile, File, Form
import base64
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


def manual_split_text(text, chunk_size=500):
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]


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


@app.get("/")
def home():
    return {"status": "Backend is running!"}


@app.post("/analyze-prescription")
async def analyze_prescription(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
       
        chat_completion = client.chat.completions.create(
            model="llama-3.2-11b-vision-pixtral", 
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": "Analyze this prescription. Return ONLY a JSON object with: 'diagnosis', 'medicines' (list), and 'dietary_advice'."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                        },
                    ],
                }
            ],
            response_format={"type": "json_object"}
        )

        analysis = json.loads(chat_completion.choices[0].message.content)
        return {"data": analysis}

    except Exception as e:
        print(f"Vision Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))




@app.post("/chat")
async def chat(request: ChatRequest):
    try:
       
        query_vector = embedder.encode([request.message])
        distances, indices = index.search(np.array(query_vector).astype('float32'), k=1)
        dist_score = float(distances[0][0])
        
        is_match = dist_score < 1.3         
       
        if is_match:
            context = knowledge_doc[indices[0][0]]
            instruction = f"The user is asking about a personal record. Use this: {context}."
        else:
            instruction = "The user is talking about moods. Be a helpful wellness assistant."
       
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

       
        ai_json = json.loads(chat_completion.choices[0].message.content)
        
        
        print(f"AI RESPONSE: {ai_json}")

        return {"data": {
            **ai_json, 
            "is_personal": is_match 
        }}

    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")
        return {"data": {"summary": "I'm having trouble processing that right now.", "mood": "Neutral", "energy_score": 5}}