from fastapi import APIRouter, HTTPException
from typing import List, Dict
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()

@router.post("/train")
async def train_model(data: List[Dict], strategy: Dict):
    try:
        result = await ai_service.train_model(data, strategy)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/{symbol}")
async def get_prediction(symbol: str, strategy: Dict):
    try:
        result = await ai_service.get_prediction(symbol, strategy)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 