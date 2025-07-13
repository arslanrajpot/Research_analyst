#!/usr/bin/env python3
"""
Script to populate Pinecone index with sample market research data.
This will allow semantic search to work properly.
"""

import os
from pinecone import Pinecone
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from config import PINECONE_API_KEY

def populate_index():
    """Populate the Pinecone index with sample market research data."""
    
    # Sample market research documents
    sample_documents = [
        {
            "content": "AI startups are revolutionizing the market landscape by introducing innovative solutions across various industries. Companies like OpenAI, Anthropic, and Cohere are leading the charge in generative AI, while others focus on specialized applications in healthcare, finance, and manufacturing.",
            "metadata": {"source": "market_research", "topic": "AI startups", "date": "2024"}
        },
        {
            "content": "The artificial intelligence market is experiencing unprecedented growth, with startups securing billions in funding. Key trends include the rise of large language models, AI-powered automation, and the democratization of AI tools for businesses of all sizes.",
            "metadata": {"source": "market_research", "topic": "AI market trends", "date": "2024"}
        },
        {
            "content": "Market research shows that AI startups are changing how businesses operate by providing intelligent automation, predictive analytics, and personalized customer experiences. The competitive landscape is evolving rapidly as new players enter the market.",
            "metadata": {"source": "market_research", "topic": "business transformation", "date": "2024"}
        },
        {
            "content": "Investment in AI startups has reached record levels, with venture capital firms pouring billions into promising companies. The focus areas include machine learning, natural language processing, computer vision, and robotics.",
            "metadata": {"source": "market_research", "topic": "AI investment", "date": "2024"}
        },
        {
            "content": "The startup ecosystem is being transformed by artificial intelligence, with new companies emerging to solve complex problems using AI technology. This is creating opportunities for innovation and disruption across traditional industries.",
            "metadata": {"source": "market_research", "topic": "startup ecosystem", "date": "2024"}
        },
        {
            "content": "AI-powered market research tools are enabling companies to gather insights faster and more accurately than traditional methods. These tools can analyze vast amounts of data to identify trends, predict market movements, and understand customer behavior.",
            "metadata": {"source": "market_research", "topic": "AI research tools", "date": "2024"}
        },
        {
            "content": "The landscape of business technology is being reshaped by AI startups that offer solutions for data analysis, customer service, marketing automation, and operational efficiency. These innovations are driving digital transformation across industries.",
            "metadata": {"source": "market_research", "topic": "business technology", "date": "2024"}
        },
        {
            "content": "Market analysis reveals that AI startups are particularly successful in sectors like healthcare, where they're developing diagnostic tools, in finance for fraud detection, and in manufacturing for predictive maintenance and quality control.",
            "metadata": {"source": "market_research", "topic": "AI applications", "date": "2024"}
        },
        {
            "content": "The competitive advantage of AI startups lies in their ability to process and analyze data at scale, providing insights that were previously impossible to obtain. This is creating new business models and revenue streams.",
            "metadata": {"source": "market_research", "topic": "competitive advantage", "date": "2024"}
        },
        {
            "content": "Industry reports indicate that AI startups are not just changing individual companies but entire market landscapes. They're creating new categories of products and services while disrupting existing business models.",
            "metadata": {"source": "market_research", "topic": "market disruption", "date": "2024"}
        }
    ]
    
    print("Initializing Pinecone and embeddings...")
    
    # Initialize Pinecone
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index_name = "researchanalyst"
    
    # Initialize embeddings
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    
    # Initialize vector store
    vectorstore = PineconeVectorStore(index_name=index_name, embedding=embeddings, text_key="text")
    
    print(f"Adding {len(sample_documents)} documents to the index...")
    
    # Add documents to the index
    texts = [doc["content"] for doc in sample_documents]
    metadatas = [doc["metadata"] for doc in sample_documents]
    
    vectorstore.add_texts(texts=texts, metadatas=metadatas)
    
    print("Documents added successfully!")
    
    # Verify the index has data
    index = pc.Index(index_name)
    stats = index.describe_index_stats()
    print(f"Index now contains {stats['total_vector_count']} vectors")
    
    # Test semantic search
    print("\nTesting semantic search...")
    test_results = vectorstore.similarity_search("AI startups market", k=3)
    print(f"Found {len(test_results)} results for 'AI startups market'")
    
    for i, result in enumerate(test_results, 1):
        print(f"\nResult {i}:")
        print(f"Content: {result.page_content[:100]}...")
        print(f"Metadata: {result.metadata}")

if __name__ == "__main__":
    populate_index()


