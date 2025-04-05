from fastapi import APIRouter, HTTPException
from supabase import create_client
import os

router = APIRouter()

import os
from supabase import create_client

def get_supabase_client():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(supabase_url, supabase_key)

@router.get("/leagues/{league_id}")
async def get_league(league_id: str):
    supabase = get_supabase_client()
    try:
        response = supabase.table("leagues").select("*").eq("id", league_id).execute()
        print("League query result:", response.data)
        print("League query result:", response.data)
        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            raise HTTPException(status_code=404, detail="League not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tournaments/{tournament_id}")
async def get_tournament(tournament_id: str):
    supabase = get_supabase_client()
    try:
        response = supabase.table("tournaments").select("*").eq("id", tournament_id).execute()
        print("Tournament query result:", response.data)
        print("tournament query result:", response.data)
        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            raise HTTPException(status_code=404, detail="Tournament not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))