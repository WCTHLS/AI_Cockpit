from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import Dict, Any
import io
import csv
from ..schemas import ThresholdConfig
from ..data_store import store
from ..auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/thresholds", response_model=ThresholdConfig)
def get_thresholds(user: Dict[str, Any] = Depends(get_current_user)):
    return store.thresholds

@router.put("/thresholds", response_model=ThresholdConfig)
def update_thresholds(req: ThresholdConfig, user: Dict[str, Any] = Depends(get_current_user)):
    store.thresholds = req.model_dump()
    return store.thresholds

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    dataset_type: str = "agents",  # "agents", "costs", or "seats"
    user: Dict[str, Any] = Depends(get_current_user)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")
        
    content = await file.read()
    try:
        decoded = content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(decoded))
        rows = list(reader)
        
        if dataset_type == "agents":
            store.raw_agents.extend(rows)
        elif dataset_type == "costs":
            store.raw_costs.extend(rows)
            
        return {
            "status": "success",
            "filename": file.filename,
            "dataset_type": dataset_type,
            "rows_ingested": len(rows),
            "message": f"Successfully ingested {len(rows)} records into {dataset_type} mart."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse CSV: {str(e)}")
