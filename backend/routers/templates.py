from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from typing import List, Optional, Dict, Any
import json
import csv
from io import StringIO
from datetime import datetime, timedelta

from database import get_db
from auth import get_current_active_user
from models.template import (
    Template, TemplateShare, TemplateUsage, TemplateRating,
    TemplateCreate, TemplateUpdate, TemplateResponse,
    TemplateShareCreate, TemplateShareResponse, TemplateUsageResponse,
    TemplateRatingCreate, TemplateRatingResponse, TemplateAnalytics
)
from models.user import User

router = APIRouter(prefix="/templates", tags=["templates"])

def get_template_variables(prompts: List[str]) -> List[str]:
    """Extract template variables from prompts (e.g., [industry], [product])"""
    variables = set()
    for prompt in prompts:
        import re
        matches = re.findall(r'\[([^\]]+)\]', prompt)
        variables.update(matches)
    return list(variables)

def calculate_popularity(usage_count: int, days_since_creation: int) -> float:
    """Calculate template popularity based on usage and age"""
    if days_since_creation == 0:
        return usage_count
    return usage_count / max(days_since_creation, 1)

# CRUD Operations
@router.post("/", response_model=TemplateResponse)
async def create_template(
    template_data: TemplateCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new template"""
    # Extract variables from prompts
    variables = get_template_variables(template_data.prompts)
    
    # Create template data dict, excluding variables if it exists
    template_dict = template_data.dict()
    if 'variables' in template_dict:
        del template_dict['variables']
    
    template = Template(
        **template_dict,
        variables=variables,
        user_id=current_user.id
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template

@router.get("/", response_model=List[TemplateResponse])
async def get_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    include_public: bool = Query(True, description="Include public templates"),
    include_private: bool = Query(True, description="Include user's private templates"),
    featured_only: bool = Query(False, description="Show only featured templates"),
    limit: int = Query(50, description="Number of templates to return"),
    offset: int = Query(0, description="Number of templates to skip"),
    sort_by: str = Query("popularity", description="Sort by: popularity, rating, created_at, name"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get templates with filtering and sorting"""
    query = db.query(Template)
    
    # Build filters
    filters = []
    
    if category:
        filters.append(Template.category == category)
    
    if search:
        search_filter = or_(
            Template.name.ilike(f"%{search}%"),
            Template.description.ilike(f"%{search}%")
        )
        filters.append(search_filter)
    
    if featured_only:
        filters.append(Template.is_featured == True)
    
    # Handle public/private filtering
    if include_public and include_private:
        # Show all public templates + user's private templates
        filters.append(or_(
            Template.is_public == True,
            Template.user_id == current_user.id
        ))
    elif include_public:
        # Show only public templates (global templates)
        filters.append(Template.is_public == True)
    elif include_private:
        # Show only user's private templates
        filters.append(Template.user_id == current_user.id)
    
    # Apply filters
    if filters:
        query = query.filter(and_(*filters))
    
    # Apply sorting
    if sort_by == "popularity":
        query = query.order_by(desc(Template.usage_count))
    elif sort_by == "rating":
        query = query.order_by(desc(Template.rating))
    elif sort_by == "created_at":
        query = query.order_by(desc(Template.created_at))
    elif sort_by == "name":
        query = query.order_by(Template.name)
    
    # Apply pagination
    templates = query.offset(offset).limit(limit).all()
    
    # Add creator names and user's rating
    for template in templates:
        if template.user_id:
            creator = db.query(User).filter(User.id == template.user_id).first()
            template.creator_name = creator.full_name if creator else "System"
        else:
            template.creator_name = "System"
        
        # Get user's rating for this template
        user_rating = db.query(TemplateRating).filter(
            and_(
                TemplateRating.template_id == template.id,
                TemplateRating.user_id == current_user.id
            )
        ).first()
        template.user_rating = user_rating.rating if user_rating else None
    
    return templates

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific template"""
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check access permissions
    if not template.is_public and template.user_id != current_user.id:
        # Check if user has been shared the template
        share = db.query(TemplateShare).filter(
            and_(
                TemplateShare.template_id == template_id,
                TemplateShare.shared_with == current_user.id
            )
        ).first()
        
        if not share:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Add creator name
    if template.user_id:
        creator = db.query(User).filter(User.id == template.user_id).first()
        template.creator_name = creator.full_name if creator else "Unknown"
    
    return template

@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_data: TemplateUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a template"""
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check permissions
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    update_data = template_data.dict(exclude_unset=True)
    
    # Extract variables if prompts are being updated
    if "prompts" in update_data:
        update_data["variables"] = get_template_variables(update_data["prompts"])
    
    for field, value in update_data.items():
        setattr(template, field, value)
    
    template.updated_at = datetime.utcnow()
    template.version += 1
    
    db.commit()
    db.refresh(template)
    
    return template

@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a template"""
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check permissions
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete related records
    db.query(TemplateShare).filter(TemplateShare.template_id == template_id).delete()
    db.query(TemplateUsage).filter(TemplateUsage.template_id == template_id).delete()
    db.query(TemplateRating).filter(TemplateRating.template_id == template_id).delete()
    
    # Delete template
    db.delete(template)
    db.commit()
    
    return {"message": "Template deleted successfully"}

# Template Sharing
@router.post("/{template_id}/share", response_model=TemplateShareResponse)
async def share_template(
    template_id: int,
    share_data: TemplateShareCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Share a template with another user"""
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check permissions
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Find user to share with
    shared_with_user = db.query(User).filter(User.email == share_data.shared_with_email).first()
    
    if not shared_with_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if shared_with_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share with yourself")
    
    # Check if already shared
    existing_share = db.query(TemplateShare).filter(
        and_(
            TemplateShare.template_id == template_id,
            TemplateShare.shared_with == shared_with_user.id
        )
    ).first()
    
    if existing_share:
        raise HTTPException(status_code=400, detail="Template already shared with this user")
    
    # Create share
    share = TemplateShare(
        template_id=template_id,
        shared_by=current_user.id,
        shared_with=shared_with_user.id,
        permission=share_data.permission
    )
    
    db.add(share)
    db.commit()
    db.refresh(share)
    
    # Add names for response
    share.template_name = template.name
    share.shared_by_name = current_user.full_name
    share.shared_with_name = shared_with_user.full_name
    
    return share

@router.get("/shared/with-me", response_model=List[TemplateShareResponse])
async def get_templates_shared_with_me(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get templates shared with the current user"""
    shares = db.query(TemplateShare).filter(
        TemplateShare.shared_with == current_user.id
    ).all()
    
    # Add names
    for share in shares:
        template = db.query(Template).filter(Template.id == share.template_id).first()
        shared_by_user = db.query(User).filter(User.id == share.shared_by).first()
        
        share.template_name = template.name if template else "Unknown"
        share.shared_by_name = shared_by_user.full_name if shared_by_user else "Unknown"
        share.shared_with_name = current_user.full_name
    
    return shares

@router.get("/shared/by-me", response_model=List[TemplateShareResponse])
async def get_templates_shared_by_me(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get templates shared by the current user"""
    shares = db.query(TemplateShare).filter(
        TemplateShare.shared_by == current_user.id
    ).all()
    
    # Add names
    for share in shares:
        template = db.query(Template).filter(Template.id == share.template_id).first()
        shared_with_user = db.query(User).filter(User.id == share.shared_with).first()
        
        share.template_name = template.name if template else "Unknown"
        share.shared_by_name = current_user.full_name
        share.shared_with_name = shared_with_user.full_name if shared_with_user else "Unknown"
    
    return shares

# Template Usage Tracking
@router.post("/{template_id}/use")
async def record_template_usage(
    template_id: int,
    report_id: Optional[int] = None,
    generation_time: Optional[float] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Record template usage"""
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create usage record
    usage = TemplateUsage(
        template_id=template_id,
        user_id=current_user.id,
        report_id=report_id,
        generation_time=generation_time
    )
    
    db.add(usage)
    
    # Update template usage count
    template.usage_count += 1
    
    db.commit()
    
    return {"message": "Usage recorded successfully"}

@router.get("/{template_id}/usage", response_model=List[TemplateUsageResponse])
async def get_template_usage(
    template_id: int,
    limit: int = Query(50, description="Number of records to return"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get usage history for a template"""
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check permissions
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    usage_records = db.query(TemplateUsage).filter(
        TemplateUsage.template_id == template_id
    ).order_by(desc(TemplateUsage.used_at)).limit(limit).all()
    
    # Add names
    for record in usage_records:
        user = db.query(User).filter(User.id == record.user_id).first()
        record.template_name = template.name
        record.user_name = user.full_name if user else "Unknown"
    
    return usage_records

# Template Ratings
@router.post("/{template_id}/rate", response_model=TemplateRatingResponse)
async def rate_template(
    template_id: int,
    rating_data: TemplateRatingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Rate a template - ratings are global and visible to all users"""
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Validate rating
    if not 1 <= rating_data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if user already rated
    existing_rating = db.query(TemplateRating).filter(
        and_(
            TemplateRating.template_id == template_id,
            TemplateRating.user_id == current_user.id
        )
    ).first()
    
    if existing_rating:
        # Update existing rating
        existing_rating.rating = rating_data.rating
        existing_rating.review = rating_data.review
        existing_rating.created_at = datetime.utcnow()
        rating = existing_rating
    else:
        # Create new rating
        rating = TemplateRating(
            template_id=template_id,
            user_id=current_user.id,
            rating=rating_data.rating,
            review=rating_data.review
        )
        db.add(rating)
    
    # Update template rating (global average)
    ratings = db.query(TemplateRating).filter(TemplateRating.template_id == template_id).all()
    if ratings:
        avg_rating = sum(r.rating for r in ratings) / len(ratings)
        template.rating = round(avg_rating, 1)  # Round to 1 decimal place
        template.rating_count = len(ratings)
    
    db.commit()
    db.refresh(rating)
    
    # Add user name
    rating.user_name = current_user.full_name
    
    return rating

@router.get("/{template_id}/ratings", response_model=List[TemplateRatingResponse])
async def get_template_ratings(
    template_id: int,
    limit: int = Query(50, description="Number of ratings to return"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get ratings for a template"""
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    ratings = db.query(TemplateRating).filter(
        TemplateRating.template_id == template_id
    ).order_by(desc(TemplateRating.created_at)).limit(limit).all()
    
    # Add user names
    for rating in ratings:
        user = db.query(User).filter(User.id == rating.user_id).first()
        rating.user_name = user.full_name if user else "Unknown"
    
    return ratings

# Template Analytics
@router.get("/analytics/overview", response_model=TemplateAnalytics)
async def get_template_analytics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get template analytics overview"""
    # Total templates
    total_templates = db.query(Template).count()
    public_templates = db.query(Template).filter(Template.is_public == True).count()
    user_templates = db.query(Template).filter(Template.user_id == current_user.id).count()
    
    # Total usage
    total_usage = db.query(TemplateUsage).count()
    
    # Popular templates
    popular_templates = db.query(Template).order_by(desc(Template.usage_count)).limit(5).all()
    popular_data = []
    for template in popular_templates:
        creator = db.query(User).filter(User.id == template.user_id).first()
        popular_data.append({
            "id": template.id,
            "name": template.name,
            "usage_count": template.usage_count,
            "rating": template.rating,
            "creator_name": creator.full_name if creator else "Unknown"
        })
    
    # Recent activity
    recent_usage = db.query(TemplateUsage).order_by(desc(TemplateUsage.used_at)).limit(10).all()
    recent_data = []
    for usage in recent_usage:
        template = db.query(Template).filter(Template.id == usage.template_id).first()
        user = db.query(User).filter(User.id == usage.user_id).first()
        recent_data.append({
            "id": usage.id,
            "template_name": template.name if template else "Unknown",
            "user_name": user.full_name if user else "Unknown",
            "used_at": usage.used_at,
            "success": usage.success
        })
    
    # Category distribution
    category_counts = db.query(Template.category, func.count(Template.id)).group_by(Template.category).all()
    category_distribution = {category: count for category, count in category_counts}
    
    return TemplateAnalytics(
        total_templates=total_templates,
        public_templates=public_templates,
        user_templates=user_templates,
        total_usage=total_usage,
        popular_templates=popular_data,
        recent_activity=recent_data,
        category_distribution=category_distribution
    )

# Template Categories
@router.get("/categories")
async def get_template_categories(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all template categories with counts"""
    categories = db.query(
        Template.category,
        func.count(Template.id).label('count')
    ).group_by(Template.category).all()
    
    return [
        {
            "category": category,
            "count": count,
            "description": get_category_description(category)
        }
        for category, count in categories
    ]

def get_category_description(category: str) -> str:
    """Get description for template category"""
    descriptions = {
        "analysis": "Business analysis frameworks and methodologies",
        "market": "Market research and industry analysis",
        "customer": "Customer insights and behavior analysis",
        "technology": "Technology trends and innovation research",
        "financial": "Financial analysis and investment research",
        "competitive": "Competitive intelligence and benchmarking",
        "product": "Product research and development analysis",
        "marketing": "Marketing strategy and campaign research"
    }
    return descriptions.get(category, "General research templates")

# Template Import/Export
@router.post("/import")
async def import_templates(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Import templates from JSON or CSV file"""
    if not file.filename.endswith(('.json', '.csv')):
        raise HTTPException(status_code=400, detail="File must be JSON or CSV")
    
    content = await file.read()
    
    if file.filename.endswith('.json'):
        try:
            templates_data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format")
    else:
        # CSV import
        try:
            csv_content = content.decode('utf-8')
            csv_reader = csv.DictReader(StringIO(csv_content))
            templates_data = list(csv_reader)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid CSV format")
    
    imported_count = 0
    
    for template_data in templates_data:
        try:
            # Validate required fields
            if not all(key in template_data for key in ['name', 'category', 'prompts']):
                continue
            
            # Convert prompts to list if it's a string
            prompts = template_data['prompts']
            if isinstance(prompts, str):
                prompts = [p.strip() for p in prompts.split('\n') if p.strip()]
            
            template = Template(
                name=template_data['name'],
                description=template_data.get('description', ''),
                category=template_data['category'],
                icon=template_data.get('icon', '📄'),
                prompts=prompts,
                variables=get_template_variables(prompts),
                is_public=False,  # Imported templates are private by default
                user_id=current_user.id
            )
            
            db.add(template)
            imported_count += 1
            
        except Exception as e:
            continue
    
    db.commit()
    
    return {"message": f"Successfully imported {imported_count} templates"}

@router.get("/export")
async def export_templates(
    template_ids: Optional[str] = Query(None, description="Comma-separated template IDs"),
    format: str = Query("json", description="Export format (json or csv)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export templates to JSON or CSV"""
    query = db.query(Template).filter(Template.user_id == current_user.id)
    
    if template_ids:
        ids = [int(id.strip()) for id in template_ids.split(',')]
        query = query.filter(Template.id.in_(ids))
    
    templates = query.all()
    
    if format.lower() == "csv":
        # Export as CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['name', 'description', 'category', 'icon', 'prompts', 'variables', 'estimated_time', 'difficulty_level'])
        
        # Write data
        for template in templates:
            prompts_str = '\n'.join(template.prompts)
            variables_str = ', '.join(template.variables) if template.variables else ''
            
            writer.writerow([
                template.name,
                template.description or '',
                template.category,
                template.icon or '',
                prompts_str,
                variables_str,
                template.estimated_time or '',
                template.difficulty_level
            ])
        
        content = output.getvalue()
        return {"content": content, "format": "csv", "filename": "templates.csv"}
    
    else:
        # Export as JSON
        templates_data = []
        for template in templates:
            templates_data.append({
                "name": template.name,
                "description": template.description,
                "category": template.category,
                "icon": template.icon,
                "prompts": template.prompts,
                "variables": template.variables,
                "estimated_time": template.estimated_time,
                "difficulty_level": template.difficulty_level
            })
        
        return {"content": templates_data, "format": "json", "filename": "templates.json"}

# Template Duplication
@router.post("/{template_id}/duplicate", response_model=TemplateResponse)
async def duplicate_template(
    template_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Duplicate a template"""
    original_template = db.query(Template).filter(Template.id == template_id).first()
    
    if not original_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check access permissions
    if not original_template.is_public and original_template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create duplicate
    duplicate = Template(
        name=f"{original_template.name} (Copy)",
        description=original_template.description,
        category=original_template.category,
        icon=original_template.icon,
        prompts=original_template.prompts,
        variables=original_template.variables,
        structure=original_template.structure,
        is_public=False,  # Duplicates are private
        is_featured=False,
        estimated_time=original_template.estimated_time,
        difficulty_level=original_template.difficulty_level,
        user_id=current_user.id,
        parent_id=template_id  # Link to original
    )
    
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    
    return duplicate

# Featured Templates
@router.get("/featured", response_model=List[TemplateResponse])
async def get_featured_templates(
    limit: int = Query(10, description="Number of featured templates to return"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get featured templates"""
    templates = db.query(Template).filter(
        and_(
            Template.is_featured == True,
            Template.is_public == True
        )
    ).order_by(desc(Template.usage_count)).limit(limit).all()
    
    # Add creator names
    for template in templates:
        if template.user_id:
            creator = db.query(User).filter(User.id == template.user_id).first()
            template.creator_name = creator.full_name if creator else "Unknown"
    
    return templates
