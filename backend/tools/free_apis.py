import requests
import asyncio
import logging
from typing import List, Dict
from langchain_core.tools import tool
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@tool
async def news_api_search(query: str, api_key: str = None) -> List[Dict]:
    """
    Search news using NewsAPI (FREE tier: 1000 requests/day)
    Get free API key at: https://newsapi.org/
    """
    try:
        if not api_key:
            logger.warning("NewsAPI key not provided. Get free key at https://newsapi.org/")
            return []
        
        # Free tier allows 1000 requests per day
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": query,
            "apiKey": api_key,
            "sortBy": "publishedAt",
            "language": "en",
            "pageSize": 20
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        articles = data.get("articles", [])
        
        formatted_results = []
        for article in articles:
            formatted_results.append({
                "title": article.get("title", ""),
                "content": article.get("description", ""),
                "url": article.get("url", ""),
                "source": article.get("source", {}).get("name", ""),
                "published_at": article.get("publishedAt", ""),
                "type": "news",
                "sentiment": "unknown"
            })
        
        logger.info(f"NewsAPI returned {len(formatted_results)} articles")
        return formatted_results
        
    except Exception as e:
        logger.error(f"NewsAPI search error: {e}")
        return []

@tool
async def github_trending_search(query: str) -> List[Dict]:
    """
    Search GitHub trending repositories (FREE - no API key required)
    """
    try:
        # GitHub API is free for public repositories
        url = "https://api.github.com/search/repositories"
        params = {
            "q": f"{query} in:name,description",
            "sort": "stars",
            "order": "desc",
            "per_page": 20
        }
        
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "MarketResearchBot/1.0"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        repos = data.get("items", [])
        
        formatted_results = []
        for repo in repos:
            formatted_results.append({
                "title": repo.get("name", ""),
                "content": repo.get("description", ""),
                "url": repo.get("html_url", ""),
                "stars": repo.get("stargazers_count", 0),
                "language": repo.get("language", ""),
                "created_at": repo.get("created_at", ""),
                "updated_at": repo.get("updated_at", ""),
                "type": "github_repo",
                "sentiment": "positive" if repo.get("stargazers_count", 0) > 100 else "neutral"
            })
        
        logger.info(f"GitHub API returned {len(formatted_results)} repositories")
        return formatted_results
        
    except Exception as e:
        logger.error(f"GitHub search error: {e}")
        return []

@tool
async def reddit_search(query: str) -> List[Dict]:
    """
    Search Reddit for discussions (FREE - no API key required)
    """
    try:
        # Reddit JSON API is free
        url = "https://www.reddit.com/search.json"
        params = {
            "q": query,
            "sort": "relevance",
            "limit": 20,
            "t": "month"  # Last month
        }
        
        headers = {
            "User-Agent": "MarketResearchBot/1.0"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        posts = data.get("data", {}).get("children", [])
        
        formatted_results = []
        for post in posts:
            post_data = post.get("data", {})
            formatted_results.append({
                "title": post_data.get("title", ""),
                "content": post_data.get("selftext", "")[:500],  # Limit content length
                "url": f"https://reddit.com{post_data.get('permalink', '')}",
                "subreddit": post_data.get("subreddit", ""),
                "score": post_data.get("score", 0),
                "num_comments": post_data.get("num_comments", 0),
                "created_utc": post_data.get("created_utc", ""),
                "type": "reddit_post",
                "sentiment": "positive" if post_data.get("score", 0) > 10 else "neutral"
            })
        
        logger.info(f"Reddit API returned {len(formatted_results)} posts")
        return formatted_results
        
    except Exception as e:
        logger.error(f"Reddit search error: {e}")
        return []

@tool
async def hackernews_search(query: str) -> List[Dict]:
    """
    Search Hacker News (FREE - no API key required)
    """
    try:
        # Hacker News API is free
        url = "https://hn.algolia.com/api/v1/search"
        params = {
            "query": query,
            "tags": "story",
            "hitsPerPage": 20
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        hits = data.get("hits", [])
        
        formatted_results = []
        for hit in hits:
            formatted_results.append({
                "title": hit.get("title", ""),
                "content": hit.get("story_text", "")[:500] if hit.get("story_text") else "",
                "url": hit.get("url", f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"),
                "points": hit.get("points", 0),
                "num_comments": hit.get("num_comments", 0),
                "created_at": hit.get("created_at", ""),
                "author": hit.get("author", ""),
                "type": "hackernews",
                "sentiment": "positive" if hit.get("points", 0) > 50 else "neutral"
            })
        
        logger.info(f"Hacker News API returned {len(formatted_results)} stories")
        return formatted_results
        
    except Exception as e:
        logger.error(f"Hacker News search error: {e}")
        return []

@tool
async def wikipedia_search(query: str) -> List[Dict]:
    """
    Search Wikipedia (FREE - no API key required)
    """
    try:
        # Wikipedia API is free
        url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + query.replace(" ", "_")
        
        headers = {
            "User-Agent": "MarketResearchBot/1.0 (https://example.com/contact)"
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if "title" in data:
            formatted_results = [{
                "title": data.get("title", ""),
                "content": data.get("extract", ""),
                "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                "type": "wikipedia",
                "sentiment": "neutral"
            }]
        else:
            formatted_results = []
        
        logger.info(f"Wikipedia API returned {len(formatted_results)} articles")
        return formatted_results
        
    except Exception as e:
        logger.error(f"Wikipedia search error: {e}")
        return []


