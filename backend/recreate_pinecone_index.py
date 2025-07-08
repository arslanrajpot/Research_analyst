#!/usr/bin/env python3
"""
Script to recreate Pinecone index with correct dimensions.
Run this if you need to recreate your Pinecone index to match your embedding model.
"""

import os
from pinecone import Pinecone, ServerlessSpec
from langchain_huggingface import HuggingFaceEmbeddings
from config import PINECONE_API_KEY

def get_embedding_dimensions(model_name):
    """Get the dimensions of a sentence transformer model."""
    embeddings = HuggingFaceEmbeddings(model_name=model_name)
    test_embedding = embeddings.embed_query("test")
    return len(test_embedding)

def recreate_index():
    """Recreate the Pinecone index with correct dimensions."""
    # Use the model that produces 384 dimensions (matching the error)
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    
    print(f"Testing model: {model_name}")
    dimensions = get_embedding_dimensions(model_name)
    print(f"Model produces {dimensions} dimensions")
    
    # Initialize Pinecone
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index_name = "researchanalyst"
    
    # Check if index exists
    existing_indexes = [index.name for index in pc.list_indexes()]
    
    if index_name in existing_indexes:
        print(f"Deleting existing index: {index_name}")
        pc.delete_index(index_name)
    
    print(f"Creating new index: {index_name} with {dimensions} dimensions")
    
    # Create new index
    pc.create_index(
        name=index_name,
        dimension=dimensions,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )
    
    print(f"Index '{index_name}' created successfully with {dimensions} dimensions")

if __name__ == "__main__":
    recreate_index()
