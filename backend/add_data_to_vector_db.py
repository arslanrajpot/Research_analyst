#!/usr/bin/env python3
"""
Script to add various types of data to the Pinecone vector database.
Supports multiple data sources and formats.
"""

import os
import json
import csv
from datetime import datetime
from typing import List, Dict, Any
from pinecone import Pinecone
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from config import PINECONE_API_KEY

class VectorDBManager:
    def __init__(self):
        self.pc = Pinecone(api_key=PINECONE_API_KEY)
        self.index_name = "researchanalyst"
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        self.vectorstore = PineconeVectorStore(index_name=self.index_name, embedding=self.embeddings, text_key="text")
    
    def add_market_research_data(self, data: List[Dict[str, Any]]):
        """Add market research documents to the vector database."""
        print(f"Adding {len(data)} market research documents...")
        
        texts = []
        metadatas = []
        
        for doc in data:
            texts.append(doc["content"])
            metadata = {
                "source": "market_research",
                "topic": doc.get("topic", "general"),
                "date": doc.get("date", datetime.now().strftime("%Y-%m-%d")),
                "author": doc.get("author", "unknown"),
                "url": doc.get("url", ""),
                "type": "research_document"
            }
            metadatas.append(metadata)
        
        self.vectorstore.add_texts(texts=texts, metadatas=metadatas)
        print(f"Successfully added {len(data)} market research documents")
    
    def add_industry_reports(self, reports: List[Dict[str, Any]]):
        """Add industry reports and whitepapers."""
        print(f"Adding {len(reports)} industry reports...")
        
        texts = []
        metadatas = []
        
        for report in reports:
            texts.append(report["content"])
            metadata = {
                "source": "industry_report",
                "industry": report.get("industry", "general"),
                "company": report.get("company", "unknown"),
                "date": report.get("date", datetime.now().strftime("%Y-%m-%d")),
                "report_type": report.get("type", "whitepaper"),
                "url": report.get("url", ""),
                "type": "industry_report"
            }
            metadatas.append(metadata)
        
        self.vectorstore.add_texts(texts=texts, metadatas=metadatas)
        print(f"Successfully added {len(reports)} industry reports")
    
    def add_news_articles(self, articles: List[Dict[str, Any]]):
        """Add news articles and media content."""
        print(f"Adding {len(articles)} news articles...")
        
        texts = []
        metadatas = []
        
        for article in articles:
            texts.append(article["content"])
            metadata = {
                "source": "news_article",
                "publication": article.get("publication", "unknown"),
                "date": article.get("date", datetime.now().strftime("%Y-%m-%d")),
                "category": article.get("category", "general"),
                "url": article.get("url", ""),
                "type": "news_article"
            }
            metadatas.append(metadata)
        
        self.vectorstore.add_texts(texts=texts, metadatas=metadatas)
        print(f"Successfully added {len(articles)} news articles")
    
    def add_user_reports(self, reports: List[Dict[str, Any]]):
        """Add user-generated reports and analyses."""
        print(f"Adding {len(reports)} user reports...")
        
        texts = []
        metadatas = []
        
        for report in reports:
            texts.append(report["content"])
            metadata = {
                "source": "user_report",
                "user_id": report.get("user_id", "unknown"),
                "template": report.get("template", "custom"),
                "date": report.get("date", datetime.now().strftime("%Y-%m-%d")),
                "query": report.get("query", ""),
                "type": "user_report"
            }
            metadatas.append(metadata)
        
        self.vectorstore.add_texts(texts=texts, metadatas=metadatas)
        print(f"Successfully added {len(reports)} user reports")
    
    def add_from_json_file(self, file_path: str, data_type: str = "market_research"):
        """Add data from a JSON file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if data_type == "market_research":
                self.add_market_research_data(data)
            elif data_type == "industry_reports":
                self.add_industry_reports(data)
            elif data_type == "news_articles":
                self.add_news_articles(data)
            elif data_type == "user_reports":
                self.add_user_reports(data)
            else:
                print(f"Unknown data type: {data_type}")
                
        except Exception as e:
            print(f"Error loading data from {file_path}: {e}")
    
    def add_from_csv_file(self, file_path: str, content_column: str = "content"):
        """Add data from a CSV file."""
        try:
            texts = []
            metadatas = []
            
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if content_column in row and row[content_column].strip():
                        texts.append(row[content_column])
                        
                        metadata = {
                            "source": "csv_import",
                            "date": datetime.now().strftime("%Y-%m-%d"),
                            "type": "imported_data"
                        }
                        
                        # Add all other columns as metadata
                        for key, value in row.items():
                            if key != content_column and value.strip():
                                metadata[key] = value
                        
                        metadatas.append(metadata)
            
            if texts:
                self.vectorstore.add_texts(texts=texts, metadatas=metadatas)
                print(f"Successfully added {len(texts)} documents from CSV")
            else:
                print("No valid content found in CSV file")
                
        except Exception as e:
            print(f"Error loading data from {file_path}: {e}")
    
    def get_index_stats(self):
        """Get current index statistics."""
        index = self.pc.Index(self.index_name)
        stats = index.describe_index_stats()
        return stats
    
    def search_test(self, query: str, k: int = 5):
        """Test search functionality."""
        results = self.vectorstore.similarity_search(query, k=k)
        print(f"\nSearch results for '{query}':")
        for i, result in enumerate(results, 1):
            print(f"\nResult {i}:")
            print(f"Content: {result.page_content[:200]}...")
            print(f"Metadata: {result.metadata}")

def main():
    """Example usage of the VectorDBManager."""
    manager = VectorDBManager()
    
    # Example: Add sample market research data
    sample_data = [
        {
            "content": "Digital transformation in retail is accelerating as companies adopt AI-powered customer analytics, personalized marketing, and omnichannel experiences. The pandemic has accelerated this shift, with 78% of retailers reporting increased investment in digital technologies.",
            "topic": "retail_digital_transformation",
            "date": "2024-01-15",
            "author": "Market Research Team",
            "url": "https://example.com/retail-transformation"
        },
        {
            "content": "Sustainability is becoming a key driver in consumer purchasing decisions, with 67% of consumers willing to pay more for sustainable products. Companies are responding by integrating ESG principles into their business strategies and supply chains.",
            "topic": "sustainability_consumer_behavior",
            "date": "2024-01-20",
            "author": "Sustainability Research Group",
            "url": "https://example.com/sustainability-trends"
        }
    ]
    
    # Add the sample data
    manager.add_market_research_data(sample_data)
    
    # Get index stats
    stats = manager.get_index_stats()
    print(f"\nIndex statistics: {stats}")
    
    # Test search
    manager.search_test("digital transformation retail", k=3)

if __name__ == "__main__":
    main()


