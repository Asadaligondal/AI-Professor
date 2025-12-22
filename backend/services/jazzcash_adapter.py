"""
JazzCash/Easypaisa Payment Gateway Integration
Implements HTTP POST redirect-based payment flow with pp_SecureHash.
Documentation: https://sandbox.jazzcash.com.pk/Sandbox/
"""

import hmac
import hashlib
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from urllib.parse import urlencode

from .payment_adapter import PaymentAdapter, PaymentError, PaymentStatus


logger = logging.getLogger(__name__)


class JazzCashAdapter(PaymentAdapter):
    """
    JazzCash/Easypaisa payment gateway implementation.
    Uses HTTP POST redirect with HMAC-SHA256 secure hash.
    """
    
    # JazzCash API endpoints
    SANDBOX_URL = "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform"
    PRODUCTION_URL = "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform"
    
    def __init__(
        self,
        merchant_id: str,
        password: str,
        integrity_salt: str,
        environment: str = "sandbox"
    ):
        """
        Initialize JazzCash adapter.
        
        Args:
            merchant_id: JazzCash merchant ID
            password: JazzCash merchant password
            integrity_salt: Integrity salt for secure hash generation
            environment: 'sandbox' or 'production'
        """
        if not merchant_id or not password or not integrity_salt:
            raise ValueError("JazzCash merchant credentials are required")
        
        self.merchant_id = merchant_id
        self.password = password
        self.integrity_salt = integrity_salt
        self.environment = environment
        self.payment_url = self.SANDBOX_URL if environment == "sandbox" else self.PRODUCTION_URL
        
        logger.info(f"JazzCash adapter initialized in {environment} mode")
    
    def _generate_secure_hash(self, params: Dict[str, Any]) -> str:
        """
        Generate pp_SecureHash using HMAC-SHA256.
        Hash is created from concatenated parameter values.
        """
        # Sort parameters and concatenate values
        sorted_params = sorted(params.items())
        hash_string = self.integrity_salt + '&' + '&'.join([str(v) for k, v in sorted_params])
        
        # Generate HMAC-SHA256 hash
        secure_hash = hmac.new(
            self.integrity_salt.encode(),
            hash_string.encode(),
            hashlib.sha256
        ).hexdigest().upper()
        
        return secure_hash
    
    def _generate_transaction_id(self, user_id: str) -> str:
        """Generate unique transaction ID"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"T{timestamp}{user_id[:6]}"
    
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
        Create JazzCash checkout session.
        Returns form data for HTTP POST redirect.
        """
        try:
            # Generate transaction reference
            txn_ref_no = self._generate_transaction_id(user_id)
            
            # Set expiry time (30 minutes from now)
            expiry_time = (datetime.now() + timedelta(minutes=30)).strftime("%Y%m%d %H%M%S")
            
            # Prepare payment parameters
            amount_in_paisa = int(amount * 100)  # Convert to smallest unit
            
            params = {
                "pp_Version": "1.1",
                "pp_TxnType": "MWALLET",  # Mobile wallet transaction
                "pp_Language": "EN",
                "pp_MerchantID": self.merchant_id,
                "pp_SubMerchantID": "",
                "pp_Password": self.password,
                "pp_BankID": "TBANK",  # Test bank for sandbox
                "pp_ProductID": "RETL",  # Retail
                "pp_TxnRefNo": txn_ref_no,
                "pp_Amount": str(amount_in_paisa),
                "pp_TxnCurrency": currency.upper(),
                "pp_TxnDateTime": datetime.now().strftime("%Y%m%d%H%M%S"),
                "pp_BillReference": f"examgrader_{plan_type}",
                "pp_Description": f"Exam Grader {plan_type.capitalize()} Plan",
                "pp_TxnExpiryDateTime": expiry_time,
                "pp_ReturnURL": success_url,
                "pp_SecureHash": "",  # Will be calculated
                "ppmpf_1": user_id,  # User ID in custom field
                "ppmpf_2": plan_type,  # Plan type in custom field
                "ppmpf_3": "",
                "ppmpf_4": "",
                "ppmpf_5": ""
            }
            
            # Generate secure hash
            hash_params = params.copy()
            hash_params.pop("pp_SecureHash")
            params["pp_SecureHash"] = self._generate_secure_hash(hash_params)
            
            # Create checkout URL with form data
            checkout_url = self.payment_url
            
            logger.info(f"JazzCash checkout session created: {txn_ref_no}")
            
            return {
                "checkout_url": checkout_url,
                "session_id": txn_ref_no,
                "gateway": "jazzcash",
                "amount": amount,
                "currency": currency,
                "form_data": params,  # Data for HTTP POST
                "method": "POST"  # Indicates POST redirect needed
            }
        
        except Exception as e:
            logger.error(f"JazzCash session creation failed: {str(e)}")
            raise PaymentError(
                f"Failed to create JazzCash session: {str(e)}",
                gateway="jazzcash"
            )
    
    def verify_payment(
        self,
        payment_id: str,
        payment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Verify JazzCash payment by validating response hash.
        """
        try:
            # Extract response parameters
            pp_response_code = payment_data.get("pp_ResponseCode")
            pp_secure_hash = payment_data.get("pp_SecureHash", "")
            
            # Verify secure hash
            verify_params = payment_data.copy()
            verify_params.pop("pp_SecureHash", None)
            expected_hash = self._generate_secure_hash(verify_params)
            
            if not hmac.compare_digest(expected_hash, pp_secure_hash):
                raise PaymentError(
                    "Invalid payment response hash",
                    gateway="jazzcash",
                    error_code="invalid_hash"
                )
            
            # Map response codes to status
            # 000 = Success, 001-999 = Various error codes
            status = PaymentStatus.COMPLETED if pp_response_code == "000" else PaymentStatus.FAILED
            
            return {
                "status": status,
                "amount": float(payment_data.get("pp_Amount", 0)) / 100,
                "transaction_id": payment_data.get("pp_TxnRefNo"),
                "verified": status == PaymentStatus.COMPLETED,
                "gateway": "jazzcash",
                "response_code": pp_response_code,
                "response_message": payment_data.get("pp_ResponseMessage", ""),
                "metadata": {
                    "user_id": payment_data.get("ppmpf_1"),
                    "plan_type": payment_data.get("ppmpf_2")
                }
            }
        
        except PaymentError:
            raise
        except Exception as e:
            logger.error(f"JazzCash payment verification failed: {str(e)}")
            raise PaymentError(
                f"Failed to verify JazzCash payment: {str(e)}",
                gateway="jazzcash",
                error_code="verification_error"
            )
    
    def handle_webhook(
        self,
        webhook_data: Dict[str, Any],
        signature: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle JazzCash payment response (return URL callback).
        JazzCash uses HTTP POST to return URL, not traditional webhooks.
        """
        try:
            # Verify the payment
            verification = self.verify_payment(
                webhook_data.get("pp_TxnRefNo", ""),
                webhook_data
            )
            
            return {
                "event_type": "payment.completed" if verification["verified"] else "payment.failed",
                "payment_id": webhook_data.get("pp_TxnRefNo"),
                "status": verification["status"],
                "amount": verification["amount"],
                "data": webhook_data
            }
        
        except Exception as e:
            logger.error(f"JazzCash webhook processing failed: {str(e)}")
            raise PaymentError(
                f"Webhook processing failed: {str(e)}",
                gateway="jazzcash"
            )
    
    def refund_payment(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process refund for JazzCash payment.
        Note: JazzCash refunds require merchant portal or API v2.
        """
        logger.warning("JazzCash refunds must be processed through merchant portal")
        raise PaymentError(
            "JazzCash refunds are not supported via API. Please use merchant portal.",
            gateway="jazzcash",
            error_code="not_supported"
        )


class EasypaisaAdapter(JazzCashAdapter):
    """
    Easypaisa payment gateway adapter.
    Uses same integration as JazzCash with different merchant credentials.
    """
    
    # Easypaisa uses same endpoints as JazzCash
    SANDBOX_URL = "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform"
    PRODUCTION_URL = "https://easypay.easypaisa.com.pk/easypay/Index.jsf"
    
    def __init__(
        self,
        merchant_id: str,
        password: str,
        integrity_salt: str,
        environment: str = "sandbox"
    ):
        """Initialize Easypaisa adapter (inherits from JazzCash)"""
        super().__init__(merchant_id, password, integrity_salt, environment)
        logger.info(f"Easypaisa adapter initialized in {environment} mode")
