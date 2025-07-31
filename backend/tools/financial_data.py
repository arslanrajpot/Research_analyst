import requests
import asyncio
import logging
from typing import List, Dict, Optional
from langchain_core.tools import tool
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@tool
async def yahoo_finance_search(query: str) -> List[Dict]:
    """
    Search Yahoo Finance for company and stock data (FREE)
    """
    try:
        # Yahoo Finance API is free (unofficial)
        url = "https://query1.finance.yahoo.com/v1/finance/search"
        params = {
            "q": query,
            "quotesCount": 10,
            "newsCount": 10
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        formatted_results = []
        
        # Process quotes (stocks)
        for quote in data.get("quotes", []):
            formatted_results.append({
                "title": quote.get("longname", quote.get("shortname", "")),
                "content": f"Symbol: {quote.get('symbol', '')} | Exchange: {quote.get('exchange', '')} | Type: {quote.get('quoteType', '')}",
                "url": f"https://finance.yahoo.com/quote/{quote.get('symbol', '')}",
                "symbol": quote.get("symbol", ""),
                "exchange": quote.get("exchange", ""),
                "type": "stock",
                "sentiment": "neutral"
            })
        
        # Process news
        for news in data.get("news", []):
            formatted_results.append({
                "title": news.get("title", ""),
                "content": news.get("summary", ""),
                "url": news.get("link", ""),
                "published_at": news.get("providerPublishTime", ""),
                "source": news.get("publisher", ""),
                "type": "financial_news",
                "sentiment": "unknown"
            })
        
        logger.info(f"Yahoo Finance returned {len(formatted_results)} results")
        return formatted_results
        
    except Exception as e:
        logger.error(f"Yahoo Finance search error: {e}")
        return []

@tool
async def alpha_vantage_search(query: str, api_key: str = None) -> List[Dict]:
    """
    Search Alpha Vantage for financial data (FREE tier: 5 calls/minute, 500 calls/day)
    Get free API key at: https://www.alphavantage.co/support/#api-key
    """
    try:
        if not api_key:
            logger.warning("Alpha Vantage API key not provided. Get free key at https://www.alphavantage.co/")
            return []
        
        # Search for company information
        url = "https://www.alphavantage.co/query"
        params = {
            "function": "SYMBOL_SEARCH",
            "keywords": query,
            "apikey": api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        matches = data.get("bestMatches", [])
        
        formatted_results = []
        for match in matches[:5]:  # Limit to 5 results
            formatted_results.append({
                "title": match.get("2. name", ""),
                "content": f"Symbol: {match.get('1. symbol', '')} | Region: {match.get('4. region', '')} | Currency: {match.get('8. currency', '')}",
                "symbol": match.get("1. symbol", ""),
                "region": match.get("4. region", ""),
                "currency": match.get("8. currency", ""),
                "type": "company_info",
                "sentiment": "neutral"
            })
        
        logger.info(f"Alpha Vantage returned {len(formatted_results)} results")
        return formatted_results
        
    except Exception as e:
        logger.error(f"Alpha Vantage search error: {e}")
        return []

@tool
async def sec_edgar_search(query: str) -> List[Dict]:
    """
    Search SEC EDGAR database for company filings (FREE)
    """
    try:
        # SEC EDGAR API is free
        url = "https://www.sec.gov/cgi-bin/browse-edgar"
        params = {
            "action": "getcompany",
            "CIK": query,
            "type": "10-K",
            "count": 5
        }
        
        headers = {
            "User-Agent": "MarketResearchBot contact@example.com"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse the HTML response (simplified)
        content = response.text
        
        formatted_results = []
        if "No matching CIK" not in content:
            formatted_results.append({
                "title": f"SEC Filings for {query}",
                "content": f"SEC EDGAR filings found for company {query}",
                "url": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={query}",
                "type": "sec_filing",
                "sentiment": "neutral"
            })
        
        logger.info(f"SEC EDGAR returned {len(formatted_results)} results")
        return formatted_results
        
    except Exception as e:
        logger.error(f"SEC EDGAR search error: {e}")
        return []

@tool
async def marketwatch_search(query: str) -> List[Dict]:
    """
    Search MarketWatch for financial news and data (FREE)
    """
    try:
        # MarketWatch search (web scraping approach)
        url = "https://www.marketwatch.com/search"
        params = {
            "q": query,
            "m": "Keyword",
            "rpp": 20
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        # This would require HTML parsing - simplified for now
        formatted_results = [{
            "title": f"MarketWatch search results for {query}",
            "content": f"Financial news and data from MarketWatch for {query}",
            "url": f"https://www.marketwatch.com/search?q={query}",
            "type": "financial_news",
            "sentiment": "neutral"
        }]
        
        logger.info(f"MarketWatch returned {len(formatted_results)} results")
        return formatted_results
        
    except Exception as e:
        logger.error(f"MarketWatch search error: {e}")
        return []

@tool
async def investing_com_search(query: str) -> List[Dict]:
    """
    Search Investing.com for financial data (FREE)
    """
    try:
        # Investing.com search
        url = "https://www.investing.com/search/"
        params = {
            "q": query
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Simplified response
        formatted_results = [{
            "title": f"Investing.com results for {query}",
            "content": f"Financial data and analysis from Investing.com for {query}",
            "url": f"https://www.investing.com/search/?q={query}",
            "type": "financial_data",
            "sentiment": "neutral"
        }]
        
        logger.info(f"Investing.com returned {len(formatted_results)} results")
        return formatted_results
        
    except Exception as e:
        logger.error(f"Investing.com search error: {e}")
        return []


