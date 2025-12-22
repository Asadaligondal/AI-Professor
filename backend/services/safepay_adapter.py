"""
Safepay Payment Gateway Integration
Implements Hosted Checkout API for card and bank account payments.
Documentation: https://docs.safepay.com.pk
"""

import requests
import hmac
import hashlib
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from .payment_adapter import PaymentAdapter, PaymentError, PaymentStatus


logger = logging.getLogger(__name__)


class SafepayAdapter(PaymentAdapter):
    """
    Safepay payment gateway implementation.
    Supports card payments and bank account payments via hosted checkout.
    """
    
    # Safepay API endpoints
    SANDBOX_URL = "https://sandbox.api.safepay.com.pk"
    PRODUCTION_URL = "https://api.safepay.com.pk"
    
    def __init__(
        self,
        api_key: str,
        api_secret: str,
        environment: str = "sandbox"
    ):
        """
        Initialize Safepay adapter.
        
        Args:
            api_key: Safepay API key
            api_secret: Safepay API secret for webhook verification
            environment: 'sandbox' or 'production'
        """
        if not api_key or not api_secret:
            raise ValueError("Safepay API key and secret are required")
        
        self.api_key = api_key
        self.api_secret = api_secret
        self.environment = environment
        self.base_url = self.SANDBOX_URL if environment == "sandbox" else self.PRODUCTION_URL
        
        logger.info(f"Safepay adapter initialized in {environment} mode")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get API request headers"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def create_checkout_session(
        self,
        amount: float,
        currency: str,
        plan_type: str,
        user_id: str,
        success_url: str,
        cancel_url: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a Safepay hosted checkout session.
        
        Returns checkout URL where customer can pay via card or bank account.
        """
        try:
            # Convert amount to paisa (Safepay uses smallest currency unit)
            amount_in_paisa = int(amount * 100)
            
            # Prepare checkout payload
            payload = {
                "environment": self.environment,
                "amount": amount_in_paisa,
                "currency": currency.upper(),
                "order_id": f"exam_grader_{user_id}_{datetime.now().timestamp()}",
                "source": "custom",
                "webhook_url": f"{success_url.split('/success')[0]}/webhook/safepay",
                "redirect_url": success_url,
                "cancel_url": cancel_url,
                "metadata": {
                    "plan_type": plan_type,
                    "user_id": user_id,
                    **(metadata or {})
                }
            }
            
            # Make API request to create checkout session
            response = requests.post(
                f"{self.base_url}/checkout/create",
                headers=self._get_headers(),
                json=payload,
                timeout=10
            )
            
            response.raise_for_status()
            data = response.json()
            
            # Extract checkout URL
            if not data.get("data", {}).get("checkout_url"):
                raise PaymentError(
                    "Safepay did not return a checkout URL",
                    gateway="safepay",
                    details=data
                )
            
            logger.info(f"Safepay checkout session created: {data.get('data', {}).get('token')}")
            
            return {
                "checkout_url": data["data"]["checkout_url"],
                "session_id": data["data"]["token"],
                "gateway": "safepay",
                "amount": amount,
                "currency": currency
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Safepay API request failed: {str(e)}")
            raise PaymentError(
                f"Failed to create Safepay checkout: {str(e)}",
                gateway="safepay",
                error_code="api_error"
            )
        except Exception as e:
            logger.error(f"Unexpected error creating Safepay session: {str(e)}")
            raise PaymentError(
                f"Safepay checkout creation failed: {str(e)}",
                gateway="safepay"
            )
    
    def verify_payment(
        self,
        payment_id: str,
        payment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Verify a Safepay payment by checking its status.
        """
        try:
            # Get payment details from Safepay
            response = requests.get(
                f"{self.base_url}/payments/{payment_id}",
                headers=self._get_headers(),
                timeout=10
            )
            
            response.raise_for_status()
            data = response.json()
            
            payment_info = data.get("data", {})
            state = payment_info.get("state", "").lower()
            
            # Map Safepay states to our status
            status_mapping = {
                "completed": PaymentStatus.COMPLETED,
                "pending": PaymentStatus.PENDING,
                "failed": PaymentStatus.FAILED,
                "cancelled": PaymentStatus.CANCELLED
            }
            
            status = status_mapping.get(state, PaymentStatus.PENDING)
            
            return {
                "status": status,
                "amount": payment_info.get("amount", 0) / 100,  # Convert from paisa
                "transaction_id": payment_info.get("token"),
                "verified": status == PaymentStatus.COMPLETED,
                "gateway": "safepay",
                "payment_method": payment_info.get("payment_method"),
                "metadata": payment_info.get("metadata", {})
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Safepay payment verification failed: {str(e)}")
            raise PaymentError(
                f"Failed to verify Safepay payment: {str(e)}",
                gateway="safepay",
                error_code="verification_error"
            )
    
    def handle_webhook(
        self,
        webhook_data: Dict[str, Any],
        signature: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle Safepay webhook notifications.
        Verifies signature and processes payment events.
        """
        try:
            # Verify webhook signature
            if signature:
                is_valid = self._verify_webhook_signature(webhook_data, signature)
                if not is_valid:
                    raise PaymentError(
                        "Invalid webhook signature",
                        gateway="safepay",
                        error_code="invalid_signature"
                    )
            
            # Extract event data
            event_type = webhook_data.get("event", {}).get("type")
            payment_data = webhook_data.get("data", {})
            
            return {
                "event_type": event_type,
                "payment_id": payment_data.get("token"),
                "status": payment_data.get("state", "").lower(),
                "amount": payment_data.get("amount", 0) / 100,
                "data": payment_data
            }
        
        except Exception as e:
            logger.error(f"Safepay webhook processing failed: {str(e)}")
            raise PaymentError(
                f"Webhook processing failed: {str(e)}",
                gateway="safepay"
            )
    
    def _verify_webhook_signature(
        self,
        webhook_data: Dict[str, Any],
        signature: str
    ) -> bool:
        """
        Verify Safepay webhook signature using HMAC-SHA256.
        """
        try:
            # Create signature from webhook data
            payload_string = json.dumps(webhook_data, separators=(',', ':'))
            expected_signature = hmac.new(
                self.api_secret.encode(),
                payload_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
        
        except Exception as e:
            logger.error(f"Webhook signature verification error: {str(e)}")
            return False
    
    def refund_payment(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a refund for a Safepay payment.
        """
        try:
            payload = {
                "token": payment_id
            }
            
            if amount is not None:
                payload["amount"] = int(amount * 100)  # Convert to paisa
            
            if reason:
                payload["reason"] = reason
            
            response = requests.post(
                f"{self.base_url}/payments/{payment_id}/refund",
                headers=self._get_headers(),
                json=payload,
                timeout=10
            )
            
            response.raise_for_status()
            data = response.json()
            
            refund_info = data.get("data", {})
            
            return {
                "refund_id": refund_info.get("refund_id"),
                "status": refund_info.get("state", "pending"),
                "amount": refund_info.get("amount", 0) / 100,
                "gateway": "safepay"
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Safepay refund failed: {str(e)}")
            raise PaymentError(
                f"Failed to process Safepay refund: {str(e)}",
                gateway="safepay",
                error_code="refund_error"
            )
