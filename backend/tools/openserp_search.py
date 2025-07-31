import requests
import asyncio
import logging
from langchain_core.tools import tool
from typing import List, Dict

logger = logging.getLogger(__name__)

async def openserp_search_tool(query: str, engine: str = "google") -> List[Dict]:
    """
    Use OpenSerp for reliable search results from Google, Yandex, or Baidu.
    This is FREE and already available in your project!
    """
    try:
        logger.info(f"OpenSerp search: {query} using {engine}")
        
        # Your OpenSerp server should be running on localhost:7000
        url = f"http://localhost:7000/{engine}/search"
        params = {
            "text": query,
            "limit": 10,  # Number of results
            "lang": "EN"  # English language
        }
        
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        results = response.json()
        formatted_results = []
        
        # OpenSerp returns an array of results directly
        for result in results:
            formatted_results.append({
                "url": result.get("url", ""),
                "title": result.get("title", ""),
                "snippet": result.get("description", ""),
                "source": "openserp",
                "engine": engine,
                "rank": result.get("rank", 0),
                "ad": result.get("ad", False)
            })
        
        logger.info(f"OpenSerp returned {len(formatted_results)} results")
        return formatted_results
        
    except requests.exceptions.ConnectionError:
        logger.warning("OpenSerp server not running. Start it with: cd openserp && go run . serve --port 7000")
        return []
    except requests.exceptions.Timeout:
        logger.warning(f"OpenSerp search timeout for query: {query}")
        return []
    except Exception as e:
        logger.error(f"OpenSerp search error: {e}")
        return []

async def openserp_google_search(query: str) -> List[Dict]:
    """Search Google using OpenSerp"""
    return await openserp_search_tool(query, "google")

async def openserp_yandex_search(query: str) -> List[Dict]:
    """Search Yandex using OpenSerp"""
    return await openserp_search_tool(query, "yandex")

async def openserp_baidu_search(query: str) -> List[Dict]:
    """Search Baidu using OpenSerp"""
    return await openserp_search_tool(query, "baidu")


