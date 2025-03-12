from fastapi import FastAPI, Request, Response
import uvicorn

app = FastAPI()

# Simple middleware to handle CORS
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    # Get the origin from the request headers
    origin = request.headers.get("Origin", "")
    print(f"Request from origin: {origin}")
    
    # Handle OPTIONS preflight requests
    if request.method == "OPTIONS":
        print("Handling OPTIONS request")
        # Create a response with CORS headers
        return Response(
            content="",
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                "Access-Control-Max-Age": "86400",
            },
        )
    
    # Process the request and get the response
    response = await call_next(request)
    
    # Add CORS headers to the response
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    
    print(f"Returning response with headers: {response.headers}")
    return response

@app.get("/ping")
async def ping():
    print("Ping endpoint called")
    return {"ping": "pong", "message": "CORS test"}

if __name__ == "__main__":
    print("Starting server on http://localhost:8000")
    print("CORS is enabled for all origins")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info") 