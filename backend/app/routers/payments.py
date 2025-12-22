"""
Payment Router
API endpoints for payment gateway integrations.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field

from app.database import get_db
from app import models
from app.config import get_settings
from app.websocket import manager
from services.payment_adapter import PaymentGateway, PaymentError
from services.safepay_adapter import SafepayAdapter
from services.jazzcash_adapter import JazzCashAdapter, EasypaisaAdapter


# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1/payments",
    tags=["Payments"],
    responses={404: {"description": "Not found"}}
)


# Request/Response schemas
class CreateCheckoutRequest(BaseModel):
    """Request schema for creating checkout session"""
    plan_type: str = Field(..., description="Subscription plan: 'starter', 'pro', or 'enterprise'")
    gateway_choice: str = Field(..., description="Payment gateway: 'safepay', 'jazzcash', or 'easypaisa'")
    user_id: str = Field(..., description="Clerk user ID")


class CheckoutResponse(BaseModel):
    """Response schema for checkout session"""
    checkout_url: str
    session_id: str
    gateway: str
    amount: float
    currency: str
    method: Optional[str] = "GET"  # GET or POST
    form_data: Optional[dict] = None  # For POST redirects


class WebhookVerifyRequest(BaseModel):
    """Request schema for webhook verification"""
    payment_id: str
    gateway: str


# Plan pricing configuration
PLAN_PRICING = {
    "starter": {"amount": 1500.0, "exams": 10, "submissions": 100},
    "pro": {"amount": 3500.0, "exams": 50, "submissions": 500},
    "enterprise": {"amount": 7500.0, "exams": -1, "submissions": -1}  # -1 means unlimited
}


def get_payment_adapter(gateway: str, settings):
    """
    Factory function to get payment adapter based on gateway choice.
    
    Args:
        gateway: Payment gateway name
        settings: Application settings
    
    Returns:
        PaymentAdapter instance
    
    Raises:
        HTTPException: If gateway is not supported or credentials missing
    """
    gateway = gateway.lower()
    
    if gateway == PaymentGateway.SAFEPAY:
        if not settings.safepay_api_key or not settings.safepay_api_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Safepay credentials not configured"
            )
        return SafepayAdapter(
            api_key=settings.safepay_api_key,
            api_secret=settings.safepay_api_secret,
            environment=settings.payment_environment
        )
    
    elif gateway == PaymentGateway.JAZZCASH:
        if not settings.jazzcash_merchant_id or not settings.jazzcash_password:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="JazzCash credentials not configured"
            )
        return JazzCashAdapter(
            merchant_id=settings.jazzcash_merchant_id,
            password=settings.jazzcash_password,
            integrity_salt=settings.jazzcash_integrity_salt,
            environment=settings.payment_environment
        )
    
    elif gateway == PaymentGateway.EASYPAISA:
        if not settings.easypaisa_merchant_id or not settings.easypaisa_password:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Easypaisa credentials not configured"
            )
        return EasypaisaAdapter(
            merchant_id=settings.easypaisa_merchant_id,
            password=settings.easypaisa_password,
            integrity_salt=settings.easypaisa_integrity_salt,
            environment=settings.payment_environment
        )
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported payment gateway: {gateway}"
        )


@router.post(
    "/create",
    response_model=CheckoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Create payment checkout session",
    description="Create a checkout session for the selected payment gateway"
)
async def create_checkout_session(
    request: CreateCheckoutRequest,
    db: Session = Depends(get_db)
):
    """
    Create a payment checkout session.
    
    Returns checkout URL where user can complete payment.
    For JazzCash/Easypaisa, returns form data for HTTP POST redirect.
    """
    settings = get_settings()
    
    try:
        # Validate plan type
        if request.plan_type not in PLAN_PRICING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan type. Must be one of: {list(PLAN_PRICING.keys())}"
            )
        
        # Get plan pricing
        plan_config = PLAN_PRICING[request.plan_type]
        amount = plan_config["amount"]
        
        # Get payment adapter
        adapter = get_payment_adapter(request.gateway_choice, settings)
        
        # Prepare URLs
        base_url = settings.frontend_url or "http://localhost:3000"
        success_url = f"{base_url}/dashboard/payment/success"
        cancel_url = f"{base_url}/dashboard/payment/cancelled"
        
        # Create checkout session
        checkout_data = adapter.create_checkout_session(
            amount=amount,
            currency="PKR",
            plan_type=request.plan_type,
            user_id=request.user_id,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "exams_limit": plan_config["exams"],
                "submissions_limit": plan_config["submissions"]
            }
        )
        
        logger.info(
            f"Checkout session created: {request.gateway_choice} - "
            f"{request.plan_type} - User: {request.user_id}"
        )
        
        return CheckoutResponse(**checkout_data)
    
    except PaymentError as e:
        logger.error(f"Payment error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating checkout: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


@router.post(
    "/webhook/{gateway}",
    status_code=status.HTTP_200_OK,
    summary="Handle payment webhook",
    description="Process webhook notifications from payment gateways"
)
async def handle_payment_webhook(
    gateway: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle webhook/callback from payment gateway.
    Verifies payment and updates user subscription.
    """
    settings = get_settings()
    
    try:
        # Get webhook data
        if request.method == "POST":
            content_type = request.headers.get("content-type", "")
            
            if "application/json" in content_type:
                webhook_data = await request.json()
            else:
                # Form data (for JazzCash/Easypaisa)
                form_data = await request.form()
                webhook_data = dict(form_data)
        else:
            webhook_data = dict(request.query_params)
        
        # Get signature if present
        signature = request.headers.get("X-Safepay-Signature") or webhook_data.get("pp_SecureHash")
        
        # Get payment adapter
        adapter = get_payment_adapter(gateway, settings)
        
        # Process webhook
        event_data = adapter.handle_webhook(webhook_data, signature)
        
        logger.info(f"Webhook processed: {gateway} - {event_data.get('event_type')}")
        
        # Update user subscription if payment completed
        if event_data.get("status") == "completed":
            user_id = webhook_data.get("metadata", {}).get("user_id") or webhook_data.get("ppmpf_1")
            plan_type = webhook_data.get("metadata", {}).get("plan_type") or webhook_data.get("ppmpf_2")
            
            if user_id:
                user = db.query(models.User).filter(models.User.clerk_id == user_id).first()
                if user:
                    # Update subscription status to PRO
                    user.subscription_status = models.SubscriptionStatus.PRO
                    user.credits = 500
                    
                    # Store payment gateway reference if available
                    if gateway == "safepay" and event_data.get("payment_id"):
                        user.safepay_customer_id = event_data.get("payment_id")
                    
                    db.commit()
                    db.refresh(user)
                    
                    logger.info(f"✅ Payment completed for user {user_id}: upgraded to PRO with 500 credits")
                    
                    # Send WebSocket notification to user
                    await manager.send_personal_message(
                        {
                            "type": "payment_success",
                            "data": {
                                "subscription_status": "PRO",
                                "credits": 500,
                                "plan_type": plan_type,
                                "message": "Payment successful! Your account has been upgraded."
                            }
                        },
                        user_id
                    )
                else:
                    logger.warning(f"User not found for payment: {user_id}")
        
        return {"status": "success", "message": "Webhook processed"}
    
    except PaymentError as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )


@router.post(
    "/verify",
    status_code=status.HTTP_200_OK,
    summary="Verify payment",
    description="Verify a payment transaction"
)
async def verify_payment(
    request: WebhookVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Verify a payment transaction.
    Used after payment redirect to confirm payment status.
    """
    settings = get_settings()
    
    try:
        adapter = get_payment_adapter(request.gateway, settings)
        
        verification = adapter.verify_payment(
            payment_id=request.payment_id,
            payment_data={}
        )
        
        return {
            "verified": verification["verified"],
            "status": verification["status"],
            "amount": verification["amount"],
            "transaction_id": verification["transaction_id"]
        }
    
    except PaymentError as e:
        logger.error(f"Verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )


@router.get(
    "/plans",
    status_code=status.HTTP_200_OK,
    summary="Get available plans",
    description="Get list of available subscription plans with pricing"
)
async def get_plans():
    """Get available subscription plans"""
    return {
        "plans": [
            {
                "id": "starter",
                "name": "Starter",
                "price": PLAN_PRICING["starter"]["amount"],
                "currency": "PKR",
                "exams": PLAN_PRICING["starter"]["exams"],
                "submissions": PLAN_PRICING["starter"]["submissions"],
                "features": ["10 exams per month", "100 submissions", "Basic support"]
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": PLAN_PRICING["pro"]["amount"],
                "currency": "PKR",
                "exams": PLAN_PRICING["pro"]["exams"],
                "submissions": PLAN_PRICING["pro"]["submissions"],
                "features": ["50 exams per month", "500 submissions", "Priority support", "Excel export"]
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price": PLAN_PRICING["enterprise"]["amount"],
                "currency": "PKR",
                "exams": -1,
                "submissions": -1,
                "features": ["Unlimited exams", "Unlimited submissions", "24/7 support", "Custom features"]
            }
        ]
    }
