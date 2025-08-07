# Changelog - Deprecation Fixes

## Version 1.0.0 - January 2025

### Fixed Deprecation Issues

#### LLM Method Updates
- ✅ Replaced `llm.apredict()` with `llm.ainvoke()`
- ✅ Updated response handling to use `.content` attribute
- **Files**: `agents/scout.py`, `agents/critic.py`, `agents/synthesizer.py`, `agents/reporter.py`

#### Import Updates
- ✅ Updated `PromptTemplate` import from `langchain.prompts` to `langchain_core.prompts`
- ✅ Fixed Pinecone import to use `langchain_pinecone`
- **Files**: All agent files, `agents/synthesizer.py`

#### Tool Updates
- ✅ Replaced deprecated `Tool` class with `@tool` decorator
- ✅ Updated tool invocation to use `ainvoke()` instead of `run()`
- **Files**: `tools/web_search.py`, `tools/x_search.py`, `tools/browse_page.py`

#### Vector Store Updates
- ✅ Updated `add_texts()` to `aadd_texts()` for async operations
- **Files**: `agents/scout.py`

#### Pydantic Updates
- ✅ Replaced deprecated `Config` class with `ConfigDict`
- ✅ Updated `orm_mode` to `from_attributes`
- **Files**: `db/schemas.py`

#### Dependencies
- ✅ Added `langchain-core==0.3.63`
- ✅ Added `aiosqlite==0.20.0`
- ✅ Added `aiohttp==3.9.5`
- ✅ Added `tenacity==8.2.3`
- ✅ Fixed `langsmith==0.1.147`
- ✅ Fixed `langgraph-checkpoint-sqlite==1.0.4`

### Runtime Fixes

#### State Management
- ✅ Fixed Pydantic model state assignment issues
- ✅ Convert state to dict for modification in agents
- ✅ Updated router to handle state properly
- **Files**: All agent files, `routers/research.py`

#### Redis Connection Handling
- ✅ Added graceful Redis connection error handling
- ✅ Tools work without Redis when unavailable
- ✅ Added mock data fallback for testing
- **Files**: `tools/web_search.py`, `tools/x_search.py`

#### Pinecone Import Fix
- ✅ Fixed Pinecone deprecation warning
- ✅ Updated to use `PineconeVectorStore` consistently
- **Files**: `agents/scout.py`, `agents/synthesizer.py`

#### Environment Setup
- ✅ Created `setup_env.py` for environment validation
- ✅ Created `start_redis.sh` for Redis setup
- ✅ Added comprehensive error handling and fallbacks

### Benefits
- 🚀 Better performance with async operations
- 🔧 Future-proof code using latest LangChain standards
- 🛡️ Improved error handling and type safety
- 📚 Better maintainability and readability
- 🛠️ Graceful degradation when services are unavailable

### Testing
- ✅ Created `test_updates.py` to verify all fixes work correctly
- ✅ All imports and basic functionality tested
- ✅ Backward compatibility maintained
- ✅ Added environment validation tools
