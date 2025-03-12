from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Configure CORS - use the standard approach from FastAPI docs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=False,  # Important! Must be False when using wildcard origins
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/ping")
async def ping():
    return {"ping": "pong"}

@app.post("/payments")
async def payments(data: dict):
    return {
        "success": True,
        "message": "Payment received!",
        "amount": data.get("amount", 0)
    }

if __name__ == "__main__":
    print("Starting minimal CORS server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000) 