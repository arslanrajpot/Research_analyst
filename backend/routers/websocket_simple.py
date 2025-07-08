from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

class SimpleConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    def add_connection(self, websocket: WebSocket):
        self.active_connections.append(websocket)
        logger.info(f"Connection added. Total: {len(self.active_connections)}")

    def remove_connection(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"Connection removed. Total: {len(self.active_connections)}")

    def has_connections(self):
        return len(self.active_connections) > 0

    async def broadcast(self, message: str):
        if not self.active_connections:
            return
        
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(message)
            except:
                self.remove_connection(connection)

    async def send_status_update(self, status: str, details: str = "", progress: int = 0):
        if not self.has_connections():
            return
            
        message = {
            "type": "status_update",
            "status": status,
            "details": details,
            "progress": progress,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(json.dumps(message))

    async def send_subtask_update(self, task_id: str, task_name: str, status: str, description: str = ""):
        if not self.has_connections():
            return
            
        message = {
            "type": "subtask_update",
            "task_id": task_id,
            "task_name": task_name,
            "status": status,
            "description": description,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(json.dumps(message))

    async def send_workflow_start(self, total_tasks: int):
        if not self.has_connections():
            return
            
        message = {
            "type": "workflow_start",
            "total_tasks": total_tasks,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(json.dumps(message))

    async def send_research_progress(self, stage: str, message: str, progress: int = 0, data: dict = None):
        if not self.has_connections():
            return
            
        update_message = {
            "type": "research_progress",
            "stage": stage,
            "message": message,
            "progress": progress,
            "data": data or {},
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(json.dumps(update_message))

    async def send_error_update(self, error_type: str, error_message: str, stage: str = "unknown"):
        if not self.has_connections():
            return
            
        error_message_data = {
            "type": "error_update",
            "error_type": error_type,
            "error_message": error_message,
            "stage": stage,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(json.dumps(error_message_data))

# Global connection manager
manager = SimpleConnectionManager()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    manager.add_connection(websocket)
    
    try:
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": f"Connected to Market Research Generator (Client: {client_id})",
            "timestamp": datetime.now().isoformat()
        }))
        
        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
    finally:
        manager.remove_connection(websocket)

@router.get("/health")
async def websocket_health():
    return {
        "status": "healthy",
        "active_connections": len(manager.active_connections),
        "has_connections": manager.has_connections()
    }

# Export the manager for use in other modules
__all__ = ["router", "manager"]


