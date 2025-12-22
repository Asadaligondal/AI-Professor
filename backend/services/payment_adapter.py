"""
Payment Adapter Service
Abstract payment gateway interface for multiple Pakistani payment providers.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from enum import Enum


class PaymentStatus(str, Enum):
    """Payment status enum"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PaymentGateway(str, Enum):
    """Supported payment gateways"""
    SAFEPAY = "safepay"
    JAZZCASH = "jazzcash"
    EASYPAISA = "easypaisa"


class PaymentAdapter(ABC):
    """
    Abstract base class for payment gateway adapters.
    All payment gateways must implement this interface.
    """
    
    @abstractmethod
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
        Create a checkout session and return checkout URL.
        
        Args:
            amount: Payment amount
            currency: Currency code (e.g., 'PKR')
            plan_type: Subscription plan type (e.g., 'starter', 'pro')
            user_id: User identifier
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment is cancelled
            metadata: Additional metadata for the payment
        
        Returns:
            Dict containing:
                - checkout_url: URL for customer to complete payment
                - session_id: Unique session identifier
                - gateway: Gateway name
        
        Raises:
            PaymentError: If session creation fails
        """
        pass
    
    @abstractmethod
    def verify_payment(
        self,
        payment_id: str,
        payment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Verify a payment transaction.
        
        Args:
            payment_id: Payment transaction ID
            payment_data: Payment data received from gateway
        
        Returns:
            Dict containing:
                - status: Payment status (completed, failed, etc.)
                - amount: Payment amount
                - transaction_id: Gateway transaction ID
                - verified: Boolean indicating if payment is verified
        
        Raises:
            PaymentError: If verification fails
        """
        pass
    
    @abstractmethod
    def handle_webhook(
        self,
        webhook_data: Dict[str, Any],
        signature: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle webhook notifications from payment gateway.
        
        Args:
            webhook_data: Webhook payload from gateway
            signature: Webhook signature for verification (if applicable)
        
        Returns:
            Dict containing:
                - event_type: Type of webhook event
                - payment_id: Payment transaction ID
                - status: Payment status
                - data: Additional event data
        
        Raises:
            PaymentError: If webhook verification fails
        """
        pass
    
    @abstractmethod
    def refund_payment(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Refund a payment (full or partial).
        
        Args:
            payment_id: Payment transaction ID to refund
            amount: Amount to refund (None for full refund)
            reason: Reason for refund
        
        Returns:
            Dict containing:
                - refund_id: Refund transaction ID
                - status: Refund status
                - amount: Refunded amount
        
        Raises:
            PaymentError: If refund fails
        """
        pass


class PaymentError(Exception):
    """Custom exception for payment-related errors"""
    
    def __init__(
        self,
        message: str,
        gateway: Optional[str] = None,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.gateway = gateway
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary format"""
        return {
            "error": self.message,
            "gateway": self.gateway,
            "error_code": self.error_code,
            "details": self.details
        }
