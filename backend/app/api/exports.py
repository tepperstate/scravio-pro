"""
Export API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User, Campaign, ScrapedEmail, ExportHistory
from app.schemas.schemas import ExportRequest
from app.services.export_service import ExportService, generate_filename

router = APIRouter(prefix="/export", tags=["Export"])


@router.post("/download")
async def export_emails(
    request: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Export emails from a campaign
    
    Args:
        request: Contains campaign_id, format (csv/xlsx/json), and include_unverified flag
    """
    # Get campaign
    campaign = db.query(Campaign).filter(
        Campaign.id == request.campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    # Get emails for this campaign (by platform and search query)
    emails = db.query(ScrapedEmail).filter(
        ScrapedEmail.user_id == current_user.id,
        ScrapedEmail.platform == campaign.platform,
        ScrapedEmail.source_username.like(f"%{campaign.search_query}%") if campaign.search_query else True
    ).all()
    
    if not emails:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No emails found for this campaign"
        )
    
    # Create export service
    export_service = ExportService()
    
    # Generate filename
    filename = generate_filename(campaign.name, request.format)
    
    # Generate export content
    if request.format == 'csv':
        content = export_service.export_to_csv(emails, request.include_unverified)
        media_type = 'text/csv'
        response_content = content.encode('utf-8')
    elif request.format == 'xlsx':
        content = export_service.export_to_excel(emails, request.include_unverified)
        media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response_content = content
    else:  # json
        content = export_service.export_to_json(emails, request.include_unverified)
        media_type = 'application/json'
        response_content = content.encode('utf-8')
    
    # Count records
    record_count = len([e for e in emails if request.include_unverified or 
                       e.verification_status.value in ['verified', 'risky']])
    
    # Save export history
    export_service.save_export_history(
        db, current_user.id, campaign.id, filename, request.format, record_count
    )
    
    return StreamingResponse(
        BytesIO(response_content),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/history")
async def export_history(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get export history for current user"""
    exports = db.query(ExportHistory).filter(
        ExportHistory.user_id == current_user.id
    ).order_by(ExportHistory.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": e.id,
            "campaign_id": e.campaign_id,
            "filename": e.filename,
            "format": e.format,
            "record_count": e.record_count,
            "created_at": e.created_at
        }
        for e in exports
    ]


@router.post("/google-sheets")
async def export_to_google_sheets(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Export to Google Sheets format (returns data for manual import or API integration)
    """
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    emails = db.query(ScrapedEmail).filter(
        ScrapedEmail.user_id == current_user.id,
        ScrapedEmail.platform == campaign.platform
    ).all()
    
    export_service = ExportService()
    rows = export_service.export_to_google_sheets_format(emails)
    
    return {
        "spreadsheet_id": None,  # Would integrate with Google Sheets API
        "rows": rows,
        "total_rows": len(rows),
        "message": "Copy this data to Google Sheets or integrate with Google Sheets API"
    }


@router.get("/formats")
async def get_supported_formats():
    """Get list of supported export formats"""
    return {
        "formats": [
            {
                "id": "csv",
                "name": "CSV",
                "description": "Comma-separated values, works with Excel and most CRMs",
                "extension": ".csv"
            },
            {
                "id": "xlsx",
                "name": "Excel (XLSX)",
                "description": "Microsoft Excel format with formatting",
                "extension": ".xlsx"
            },
            {
                "id": "json",
                "name": "JSON",
                "description": "Structured data format for developers",
                "extension": ".json"
            }
        ],
        "crms": [
            {"id": "default", "name": "Default Columns"},
            {"id": "instantly", "name": "Instantly.ai"},
            {"id": "smartlead", "name": "Smartlead"},
            {"id": "lemlist", "name": "Lemlist"},
            {"id": "hubspot", "name": "HubSpot"},
        ]
    }