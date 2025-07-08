#!/usr/bin/env python3
"""
Router for vector database management endpoints.
Provides endpoints for adding, managing, and querying vector database content.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_active_user
from models.user import User
from services.vector_db_service import vector_db_service
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vector-db", tags=["vector-database"])

class AddDocumentRequest(BaseModel):
    content: str
    metadata: Optional[Dict[str, Any]] = {}
    source: str = "manual"
    topic: Optional[str] = None
    author: Optional[str] = None
    url: Optional[str] = None

class AddBatchDocumentsRequest(BaseModel):
    documents: List[AddDocumentRequest]

class SearchVectorDBRequest(BaseModel):
    query: str
    k: int = 5
    filter_metadata: Optional[Dict[str, Any]] = None

@router.post("/add-document")
async def add_document(
    request: AddDocumentRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Add a single document to the vector database."""
    try:
        metadata = {
            "source": request.source,
            "user_id": str(current_user.id),
            "topic": request.topic,
            "author": request.author or current_user.full_name,
            "url": request.url,
            **request.metadata
        }
        
        vector_db_service.vectorstore.add_texts(
            texts=[request.content],
            metadatas=[metadata]
        )
        
        return {
            "message": "Document added successfully",
            "document_count": 1
        }
        
    except Exception as e:
        logger.error(f"Error adding document to vector database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add document: {str(e)}")

@router.post("/add-batch")
async def add_batch_documents(
    request: AddBatchDocumentsRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Add multiple documents to the vector database."""
    try:
        texts = []
        metadatas = []
        
        for doc in request.documents:
            texts.append(doc.content)
            metadata = {
                "source": doc.source,
                "user_id": str(current_user.id),
                "topic": doc.topic,
                "author": doc.author or current_user.full_name,
                "url": doc.url,
                **doc.metadata
            }
            metadatas.append(metadata)
        
        vector_db_service.vectorstore.add_texts(texts=texts, metadatas=metadatas)
        
        return {
            "message": f"Added {len(request.documents)} documents successfully",
            "document_count": len(request.documents)
        }
        
    except Exception as e:
        logger.error(f"Error adding batch documents to vector database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add documents: {str(e)}")

@router.post("/upload-json")
async def upload_json_data(
    file: UploadFile = File(...),
    data_type: str = Form("market_research"),
    current_user: User = Depends(get_current_active_user)
):
    """Upload JSON file with documents to add to vector database."""
    try:
        if not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="File must be a JSON file")
        
        content = await file.read()
        data = json.loads(content.decode('utf-8'))
        
        if not isinstance(data, list):
            raise HTTPException(status_code=400, detail="JSON must contain an array of documents")
        
        # Convert to AddDocumentRequest format
        documents = []
        for item in data:
            if isinstance(item, dict) and "content" in item:
                doc_request = AddDocumentRequest(
                    content=item["content"],
                    metadata=item.get("metadata", {}),
                    source=item.get("source", data_type),
                    topic=item.get("topic"),
                    author=item.get("author"),
                    url=item.get("url")
                )
                documents.append(doc_request)
        
        if not documents:
            raise HTTPException(status_code=400, detail="No valid documents found in JSON")
        
        # Add documents
        batch_request = AddBatchDocumentsRequest(documents=documents)
        result = await add_batch_documents(batch_request, current_user)
        
        return {
            "message": f"Uploaded {len(documents)} documents from {file.filename}",
            "document_count": len(documents),
            "data_type": data_type
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"Error uploading JSON data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload data: {str(e)}")

@router.post("/search")
async def search_vector_db(
    request: SearchVectorDBRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Search the vector database for similar content."""
    try:
        results = vector_db_service.search_similar_content(
            request.query,
            k=request.k,
            filter_metadata=request.filter_metadata
        )
        
        formatted_results = []
        for result in results:
            formatted_results.append({
                "content": result.page_content,
                "metadata": result.metadata,
                "score": result.metadata.get("score", 0.0)
            })
        
        return {
            "query": request.query,
            "results": formatted_results,
            "total_results": len(formatted_results)
        }
        
    except Exception as e:
        logger.error(f"Error searching vector database: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/stats")
async def get_vector_db_stats(
    current_user: User = Depends(get_current_active_user)
):
    """Get vector database statistics."""
    try:
        stats = vector_db_service.get_index_stats()
        return {
            "index_stats": stats,
            "total_vectors": stats.get("total_vector_count", 0) if stats else 0,
            "namespaces": stats.get("namespaces", {}) if stats else {}
        }
        
    except Exception as e:
        logger.error(f"Error getting vector database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@router.delete("/clear")
async def clear_vector_db(
    current_user: User = Depends(get_current_active_user)
):
    """Clear all vectors from the database (admin only)."""
    try:
        # Check if user is admin (you can implement your own admin check)
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Delete all vectors
        index = vector_db_service.pc.Index(vector_db_service.index_name)
        index.delete(delete_all=True)
        
        return {
            "message": "Vector database cleared successfully",
            "cleared_by": current_user.email
        }
        
    except Exception as e:
        logger.error(f"Error clearing vector database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear database: {str(e)}")

@router.get("/health")
async def vector_db_health():
    """Check vector database health."""
    try:
        stats = vector_db_service.get_index_stats()
        return {
            "status": "healthy",
            "index_name": vector_db_service.index_name,
            "total_vectors": stats.get("total_vector_count", 0) if stats else 0,
            "dimension": stats.get("dimension", 0) if stats else 0
        }
        
    except Exception as e:
        logger.error(f"Vector database health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


