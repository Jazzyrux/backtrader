from fastapi import FastAPI
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "Trader"}

@app.get("/health")
def health_check():
    return {"status": "ok"} 