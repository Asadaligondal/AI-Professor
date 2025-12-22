"""Backend application package"""

from app.database import engine, Base

# Import models so they are registered with Base.metadata
# This is important for Alembic to detect them
from app import models
