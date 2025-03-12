from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple ping endpoint
@app.get("/ping")
def ping():
    return {"ping": "pong"}

# Only run this file directly
if __name__ == "__main__":
    print("Starting server on http://localhost:8000/ping")
    uvicorn.run(app, host="0.0.0.0", port=8000) 