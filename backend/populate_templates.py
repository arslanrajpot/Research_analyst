#!/usr/bin/env python3
"""
Populate database with global default templates
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models.template import Template
from models.user import User
from sqlalchemy.orm import sessionmaker

def get_template_variables(prompts):
    """Extract template variables from prompts (e.g., [industry], [product])"""
    variables = set()
    for prompt in prompts:
        import re
        matches = re.findall(r'\[([^\]]+)\]', prompt)
        variables.update(matches)
    return list(variables)

def populate_templates():
    """Populate database with global default templates"""
    
    # Create database session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if templates already exist
        existing_templates = db.query(Template).filter(Template.is_public == True).count()
        if existing_templates > 0:
            print(f"✅ {existing_templates} global templates already exist in database")
            return
        
        # Default global templates (available to all users)
        default_templates = [
            {
                "name": "Competitive Analysis",
                "description": "Analyze competitors in your market",
                "category": "analysis",
                "icon": "🏢",
                "prompts": [
                    "Who are the main competitors in the [industry] market?",
                    "What are their strengths and weaknesses?",
                    "How do they differentiate themselves?",
                    "What is their market share and positioning?",
                    "What are their key products and services?"
                ],
                "estimated_time": "3-5 minutes",
                "difficulty_level": "intermediate",
                "is_public": True,
                "is_featured": True
            },
            {
                "name": "Market Size & Growth",
                "description": "Understand market size and growth potential",
                "category": "market",
                "icon": "📈",
                "prompts": [
                    "What is the current market size for [product/service]?",
                    "What is the expected growth rate?",
                    "What factors are driving this growth?",
                    "What are the key market segments?",
                    "What is the total addressable market (TAM)?"
                ],
                "estimated_time": "2-4 minutes",
                "difficulty_level": "intermediate",
                "is_public": True,
                "is_featured": True
            },
            {
                "name": "Customer Insights",
                "description": "Deep dive into customer behavior and preferences",
                "category": "customer",
                "icon": "👥",
                "prompts": [
                    "Who are the target customers for [product/service]?",
                    "What are their pain points and needs?",
                    "How do they make purchasing decisions?",
                    "What are their demographics and psychographics?",
                    "What is their customer journey?"
                ],
                "estimated_time": "3-4 minutes",
                "difficulty_level": "intermediate",
                "is_public": True,
                "is_featured": True
            },
            {
                "name": "Technology Trends",
                "description": "Explore emerging technology trends",
                "category": "technology",
                "icon": "🚀",
                "prompts": [
                    "What are the latest technology trends in [industry]?",
                    "How are these trends impacting the market?",
                    "What opportunities do these trends create?",
                    "What are the adoption rates?",
                    "What are the barriers to adoption?"
                ],
                "estimated_time": "2-3 minutes",
                "difficulty_level": "intermediate",
                "is_public": True,
                "is_featured": True
            },
            {
                "name": "SWOT Analysis",
                "description": "Comprehensive SWOT analysis for any business",
                "category": "analysis",
                "icon": "📊",
                "prompts": [
                    "What are the strengths of [company/product]?",
                    "What are the weaknesses and limitations?",
                    "What opportunities exist in the market?",
                    "What threats should be considered?",
                    "How can we leverage strengths and opportunities?"
                ],
                "estimated_time": "4-6 minutes",
                "difficulty_level": "advanced",
                "is_public": True,
                "is_featured": True
            },
            {
                "name": "Porter's Five Forces",
                "description": "Industry analysis using Porter's framework",
                "category": "analysis",
                "icon": "⚔️",
                "prompts": [
                    "What is the threat of new entrants in [industry]?",
                    "What is the bargaining power of suppliers?",
                    "What is the bargaining power of buyers?",
                    "What is the threat of substitute products?",
                    "What is the intensity of competitive rivalry?"
                ],
                "estimated_time": "3-5 minutes",
                "difficulty_level": "advanced",
                "is_public": True,
                "is_featured": True
            },
            {
                "name": "Market Entry Strategy",
                "description": "Strategic analysis for entering new markets",
                "category": "market",
                "icon": "🎯",
                "prompts": [
                    "What are the best entry strategies for [market]?",
                    "What are the key success factors?",
                    "What are the main risks and challenges?",
                    "What regulatory requirements exist?",
                    "What partnerships would be beneficial?"
                ],
                "estimated_time": "4-6 minutes",
                "difficulty_level": "advanced",
                "is_public": True,
                "is_featured": False
            },
            {
                "name": "Customer Segmentation",
                "description": "Identify and analyze customer segments",
                "category": "customer",
                "icon": "🎯",
                "prompts": [
                    "What are the main customer segments for [product/service]?",
                    "What are the characteristics of each segment?",
                    "What are their different needs and preferences?",
                    "How do segments differ in behavior?",
                    "Which segments are most attractive?"
                ],
                "estimated_time": "3-5 minutes",
                "difficulty_level": "intermediate",
                "is_public": True,
                "is_featured": False
            }
        ]
        
        # Create templates (no user_id for global templates)
        for template_data in default_templates:
            # Extract variables from prompts
            variables = get_template_variables(template_data["prompts"])
            
            template = Template(
                name=template_data["name"],
                description=template_data["description"],
                category=template_data["category"],
                icon=template_data["icon"],
                prompts=template_data["prompts"],
                variables=variables,
                estimated_time=template_data["estimated_time"],
                difficulty_level=template_data["difficulty_level"],
                is_public=template_data["is_public"],
                is_featured=template_data["is_featured"],
                user_id=None  # Global templates have no owner
            )
            
            db.add(template)
        
        db.commit()
        print(f"✅ Successfully created {len(default_templates)} global templates")
        
        # Verify templates
        templates = db.query(Template).filter(Template.is_public == True).all()
        print("Created global templates:")
        for template in templates:
            print(f"  - {template.name} ({template.category}) - {'Featured' if template.is_featured else 'Standard'}")
            
        print(f"\n📊 Template Summary:")
        print(f"  Total global templates: {len(templates)}")
        print(f"  Featured templates: {sum(1 for t in templates if t.is_featured)}")
        print(f"  Categories: {', '.join(set(t.category for t in templates))}")
        
    except Exception as e:
        print(f"❌ Error populating templates: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    populate_templates()
