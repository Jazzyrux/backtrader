from flask import Flask
from flask_cors import CORS
from .routers.market_data import market_data
from .routers.strategies import bp as strategies_bp
from .routers.simulation import bp as simulation_bp

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# Enregistrement des blueprints
app.register_blueprint(market_data, url_prefix='/api/market')
app.register_blueprint(strategies_bp, url_prefix='/api/strategies')
app.register_blueprint(simulation_bp, url_prefix='/api/simulation')

@app.route('/api/test')
def test():
    return {"message": "API is working!"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True) 