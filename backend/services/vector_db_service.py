#!/usr/bin/env python3
"""
Service for automatically adding searched data to the vector database.
This service integrates with the search functionality to store new data.
"""

import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pinecone import Pinecone
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from config import PINECONE_API_KEY
import logging

logger = logging.getLogger(__name__)

class VectorDBService:
    def __init__(self):
        self.pc = Pinecone(api_key=PINECONE_API_KEY)
        self.index_name = "researchanalyst"
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        self.vectorstore = PineconeVectorStore(index_name=self.index_name, embedding=self.embeddings, text_key="text")
    
    async def add_search_results_to_vector_db(self, search_results: Dict[str, Any], search_query: str, user_id: Optional[str] = None):
        """
        Automatically add search results to the vector database.
        
        Args:
            search_results: Results from web search, social media, etc.
            search_query: The original search query
            user_id: ID of the user who performed the search
        """
        try:
            documents_to_add = []
            
            # Process external results (web, social media, news)
            if search_results.get("external_results") and not search_results["external_results"].get("error"):
                external_docs = self._process_external_results(
                    search_results["external_results"], 
                    search_query, 
                    user_id
                )
                documents_to_add.extend(external_docs)
            
            # Process internal results (user reports, saved searches)
            if search_results.get("internal_results") and not search_results["internal_results"].get("error"):
                internal_docs = self._process_internal_results(
                    search_results["internal_results"], 
                    search_query, 
                    user_id
                )
                documents_to_add.extend(internal_docs)
            
            # Process legacy aggregated results
            if search_results.get("aggregated_results"):
                legacy_docs = self._process_aggregated_results(
                    search_results["aggregated_results"], 
                    search_query, 
                    user_id
                )
                documents_to_add.extend(legacy_docs)
            
            # Add documents to vector database
            if documents_to_add:
                await self._add_documents_batch(documents_to_add)
                logger.info(f"Added {len(documents_to_add)} documents to vector database from search query: {search_query}")
            
        except Exception as e:
            logger.error(f"Error adding search results to vector database: {e}")
    
    def _process_external_results(self, external_results: Dict[str, Any], search_query: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Process external search results (web, social media, news)."""
        documents = []
        
        aggregated_results = external_results.get("aggregated_results", [])
        
        for result in aggregated_results:
            # Create content from available fields
            content_parts = []
            
            if result.get("title"):
                content_parts.append(f"Title: {result['title']}")
            
            if result.get("snippet"):
                content_parts.append(result["snippet"])
            
            if result.get("content"):
                content_parts.append(result["content"])
            
            if not content_parts:
                continue
            
            content = " ".join(content_parts)
            
            # Create metadata
            metadata = {
                "source": result.get("source", "external"),
                "type": "external_search_result",
                "search_query": search_query,
                "date_added": datetime.now().strftime("%Y-%m-%d"),
                "user_id": user_id or "anonymous",
                "url": result.get("url", ""),
                "sentiment": result.get("sentiment", "neutral"),
                "posted_at": result.get("posted_at", ""),
                "search_timestamp": result.get("search_timestamp", "")
            }
            
            # Add source-specific metadata
            if result.get("source") == "web":
                metadata["publication"] = result.get("publication", "")
                metadata["category"] = result.get("category", "")
            elif result.get("source") == "social":
                metadata["platform"] = result.get("platform", "")
                metadata["author"] = result.get("author", "")
                metadata["faves"] = result.get("faves", 0)
            
            documents.append({
                "content": content,
                "metadata": metadata
            })
        
        return documents
    
    def _process_internal_results(self, internal_results: Dict[str, Any], search_query: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Process internal search results (user reports, saved searches)."""
        documents = []
        
        aggregated_results = internal_results.get("aggregated_results", [])
        
        for result in aggregated_results:
            content = result.get("content", "")
            if not content:
                continue
            
            metadata = {
                "source": "internal_content",
                "type": result.get("type", "user_report"),
                "search_query": search_query,
                "date_added": datetime.now().strftime("%Y-%m-%d"),
                "user_id": user_id or "anonymous",
                "template": result.get("template", ""),
                "created_at": result.get("created_at", ""),
                "title": result.get("title", "")
            }
            
            documents.append({
                "content": content,
                "metadata": metadata
            })
        
        return documents
    
    def _process_aggregated_results(self, aggregated_results: List[Dict[str, Any]], search_query: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Process legacy aggregated results."""
        documents = []
        
        for result in aggregated_results:
            content_parts = []
            
            if result.get("title"):
                content_parts.append(f"Title: {result['title']}")
            
            if result.get("snippet"):
                content_parts.append(result["snippet"])
            
            if result.get("content"):
                content_parts.append(result["content"])
            
            if not content_parts:
                continue
            
            content = " ".join(content_parts)
            
            metadata = {
                "source": result.get("source", "aggregated"),
                "type": "aggregated_result",
                "search_query": search_query,
                "date_added": datetime.now().strftime("%Y-%m-%d"),
                "user_id": user_id or "anonymous",
                "url": result.get("url", ""),
                "sentiment": result.get("sentiment", "neutral"),
                "posted_at": result.get("posted_at", ""),
                "search_timestamp": result.get("search_timestamp", "")
            }
            
            documents.append({
                "content": content,
                "metadata": metadata
            })
        
        return documents
    
    async def _add_documents_batch(self, documents: List[Dict[str, Any]]):
        """Add a batch of documents to the vector database."""
        try:
            texts = [doc["content"] for doc in documents]
            metadatas = [doc["metadata"] for doc in documents]
            
            # Add documents in batches to avoid rate limits
            batch_size = 100
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                batch_metadatas = metadatas[i:i + batch_size]
                
                self.vectorstore.add_texts(texts=batch_texts, metadatas=batch_metadatas)
                
                # Small delay between batches
                if i + batch_size < len(texts):
                    await asyncio.sleep(0.1)
            
        except Exception as e:
            logger.error(f"Error adding documents batch to vector database: {e}")
            raise
    
    async def add_user_report_to_vector_db(self, report_content: str, report_metadata: Dict[str, Any]):
        """Add a user-generated report to the vector database."""
        try:
            metadata = {
                "source": "user_report",
                "type": "user_generated",
                "date_added": datetime.now().strftime("%Y-%m-%d"),
                **report_metadata
            }
            
            self.vectorstore.add_texts(texts=[report_content], metadatas=[metadata])
            logger.info(f"Added user report to vector database: {report_metadata.get('title', 'Untitled')}")
            
        except Exception as e:
            logger.error(f"Error adding user report to vector database: {e}")
            raise
    
    async def add_web_scraped_content(self, url: str, content: str, title: str = "", category: str = "general"):
        """Add web-scraped content to the vector database."""
        try:
            metadata = {
                "source": "web_scraped",
                "type": "web_content",
                "url": url,
                "title": title,
                "category": category,
                "date_added": datetime.now().strftime("%Y-%m-%d")
            }
            
            self.vectorstore.add_texts(texts=[content], metadatas=[metadata])
            logger.info(f"Added web-scraped content to vector database: {url}")
            
        except Exception as e:
            logger.error(f"Error adding web-scraped content to vector database: {e}")
            raise
    
    def get_index_stats(self):
        """Get current index statistics."""
        try:
            index = self.pc.Index(self.index_name)
            stats = index.describe_index_stats()
            return stats
        except Exception as e:
            logger.error(f"Error getting index stats: {e}")
            return None
    
    def search_similar_content(self, query: str, k: int = 5, filter_metadata: Optional[Dict[str, Any]] = None):
        """Search for similar content in the vector database."""
        try:
            if filter_metadata:
                results = self.vectorstore.similarity_search(query, k=k, filter=filter_metadata)
            else:
                results = self.vectorstore.similarity_search(query, k=k)
            
            return results
        except Exception as e:
            logger.error(f"Error searching vector database: {e}")
            return []

# Global instance
vector_db_service = VectorDBService()


