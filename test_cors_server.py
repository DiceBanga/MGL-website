from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import uuid
import uvicorn

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    # Handle preflight requests
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "600",
            },
        )
    
    response = await call_next(request)
    
    # Add CORS headers to all responses
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

@app.get("/ping")
async def ping():
    return {"ping": "pong", "time": str(uuid.uuid4())}

@app.post("/test-payment")
async def test_payment(request: Request):
    data = await request.json()
    return {
        "success": True,
        "message": "Test payment received!",
        "received_data": data,
        "payment_id": f"test-{uuid.uuid4()}"
    }

if __name__ == "__main__":
    # Run server
    uvicorn.run(app, host="0.0.0.0", port=8000) 