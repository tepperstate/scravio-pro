"""
Email Verification Engine
4-Layer Verification: Syntax, Domain/MX, SMTP, Catch-all Detection
"""

import re
import socket
import smtplib
import dns.resolver
from typing import Tuple, Optional
from dataclasses import dataclass
from email_validator import validate_email, EmailNotValidError
import asyncio

from app.core.config import settings


@dataclass
class VerificationResult:
    """Result of email verification"""
    email: str
    syntax_valid: bool = False
    domain_valid: bool = False
    mx_valid: bool = False
    smtp_verified: bool = False
    is_catch_all: bool = False
    is_disposable: bool = False
    risk_score: float = 1.0  # 0 = safe, 1 = risky
    overall_status: str = "pending"  # verified, invalid, risky, catch_all
    error_message: Optional[str] = None
    verification_details: dict = None

    def to_dict(self) -> dict:
        return {
            'syntax_valid': self.syntax_valid,
            'domain_valid': self.domain_valid,
            'mx_valid': self.mx_valid,
            'smtp_verified': self.smtp_verified,
            'is_catch_all': self.is_catch_all,
            'is_disposable': self.is_disposable,
            'risk_score': self.risk_score,
            'overall_status': self.overall_status,
            'error_message': self.error_message,
        }


class EmailVerifier:
    """
    4-Layer Email Verification Engine
    Layer 1: Syntax validation
    Layer 2: Domain & MX record check
    Layer 3: SMTP validation (connect & verify without sending)
    Layer 4: Catch-all detection
    """

    # Common disposable email domains
    DISPOSABLE_DOMAINS = {
        'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
        '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
        'yopmail.com', 'getnada.com', 'maildrop.cc', 'mohmal.com', 'tempail.com',
        'dispostable.com', 'mailnesia.com', 'spamgourmet.com', 'mintemail.com',
        'mytrashmail.com', 'mailcatch.com', 'sharklasers.com', 'guerrillamailblock.com',
        'pokemail.net', 'spam4.me', 'grr.la', 'discard.email', 'mailforspam.com',
        'emailondeck.com', 'getairmail.com', 'mytemp.email', 'tmpmail.org',
        'throwawaymail.com', 'mail-temp.com', 'fakemail.net', 'temp-mail.io',
    }

    # Role-based emails to filter (optional additional filter)
    ROLE_EMAILS = {
        'info@', 'admin@', 'support@', 'sales@', 'contact@', 'hello@',
        'noreply@', 'no-reply@', 'team@', 'help@', 'webmaster@', 'postmaster@',
    }

    def __init__(self):
        self.smtp_timeout = settings.SMTP_TIMEOUT
        self.check_catch_all = settings.CATCH_ALL_CHECK_ENABLED

    def verify(self, email: str) -> VerificationResult:
        """Run full 4-layer verification on an email"""
        result = VerificationResult(email=email)

        # Layer 1: Syntax Validation
        syntax_valid, syntax_error = self._verify_syntax(email)
        result.syntax_valid = syntax_valid
        if not syntax_valid:
            result.error_message = syntax_error
            result.overall_status = "invalid"
            result.risk_score = 1.0
            return result

        # Get domain
        domain = email.split('@')[1].lower()

        # Check disposable
        if domain in self.DISPOSABLE_DOMAINS:
            result.is_disposable = True
            result.overall_status = "invalid"
            result.risk_score = 1.0
            result.error_message = "Disposable email domain detected"
            return result

        # Layer 2: Domain & MX Validation
        domain_valid, mx_records = self._verify_domain(domain)
        result.domain_valid = domain_valid
        if not domain_valid:
            result.overall_status = "invalid"
            result.risk_score = 0.9
            result.error_message = "Invalid domain or no MX records"
            return result

        # Layer 3: MX Record Check
        result.mx_valid = len(mx_records) > 0
        if not result.mx_valid:
            result.overall_status = "invalid"
            result.risk_score = 0.85
            return result

        # Layer 4: SMTP Validation
        smtp_verified, smtp_error = self._verify_smtp(email, mx_records)
        result.smtp_verified = smtp_verified

        # Catch-all detection (if enabled)
        if self.check_catch_all:
            is_catch_all, catch_all_confidence = self._detect_catch_all(mx_records)
            result.is_catch_all = is_catch_all
        else:
            result.is_catch_all = False

        # Calculate overall status and risk score
        result.overall_status, result.risk_score = self._calculate_risk(
            result, smtp_verified, smtp_error
        )

        if result.overall_status == "invalid" and smtp_error:
            result.error_message = smtp_error

        result.verification_details = result.to_dict()
        return result

    def _verify_syntax(self, email: str) -> Tuple[bool, Optional[str]]:
        """Layer 1: Validate email syntax using email-validator"""
        try:
            # Validate and normalize email
            validation = validate_email(email, check_deliverability=False)
            return True, None
        except EmailNotValidError as e:
            return False, str(e)

    def _verify_domain(self, domain: str) -> Tuple[bool, list]:
        """Layer 2: Check if domain exists and has MX records"""
        try:
            # Check if domain resolves
            socket.gethostbyname(domain)
            
            # Get MX records
            mx_records = []
            try:
                mx_records = dns.resolver.resolve(domain, 'MX')
                mx_records = [(r.preference, str(r.exchange).rstrip('.')) for r in mx_records]
                mx_records.sort()
            except dns.resolver.NoAnswer:
                pass
            
            return True, mx_records
        except (socket.gaierror, dns.resolver.NXDOMAIN):
            return False, []
        except Exception:
            return False, []

    def _verify_smtp(self, email: str, mx_records: list) -> Tuple[bool, Optional[str]]:
        """Layer 3: SMTP validation - connect and verify without sending"""
        if not mx_records:
            return False, "No MX records found"

        # Try each MX server
        for preference, mx_server in mx_records[:3]:  # Try top 3 MX servers
            try:
                # Connect to SMTP server
                server = smtplib.SMTP(timeout=self.smtp_timeout)
                server.connect(mx_server)
                server.helo()
                
                # Try to verify the mailbox exists
                code, message = server.rcpt(email)
                server.quit()
                
                # 250 = success, 550 = mailbox doesn't exist
                if code == 250:
                    return True, None
                elif code == 550:
                    return False, "Mailbox does not exist"
                else:
                    # Unknown response, assume risky
                    return False, f"SMTP response: {code} {message}"
                    
            except smtplib.SMTPConnectError:
                continue
            except smtplib.SMTPServerDisconnected:
                continue
            except socket.timeout:
                continue
            except Exception as e:
                continue

        # If all MX servers failed to connect
        return False, "Could not connect to any SMTP server"

    def _detect_catch_all(self, mx_records: list) -> Tuple[bool, float]:
        """
        Layer 4: Catch-all detection
        A catch-all email server accepts ALL emails sent to the domain,
        making verification unreliable. We test with a random email.
        """
        if not mx_records:
            return False, 0.0

        # Generate a random test email
        test_email = f"SocialScravio_test_{random_string(8)}@"
        domain = ""

        for preference, mx_server in mx_records[:1]:
            try:
                # Check which domain we're testing
                for pref, mx in mx_records:
                    if mx_server == mx:
                        # Extract domain from MX
                        if mx.endswith('.'):
                            domain = mx[:-1]
                        else:
                            # MX might be just hostname, try getting domain
                            domain = mx.split('.')[-2] + '.' + mx.split('.')[-1]
                        break
                
                if not domain:
                    continue
                
                test_email = f"SocialScravio_verify_{random_string(10)}@{domain}"
                
                # Try to verify this random email
                server = smtplib.SMTP(timeout=self.smtp_timeout)
                server.connect(mx_server)
                server.helo()
                
                code, message = server.rcpt(test_email)
                server.quit()
                
                # If it accepts a clearly fake email, it's likely catch-all
                if code == 250:
                    return True, 0.9
                else:
                    return False, 0.1
                    
            except Exception:
                pass

        return False, 0.0

    def _calculate_risk(self, result: VerificationResult, smtp_verified: bool, 
                        smtp_error: Optional[str]) -> Tuple[str, float]:
        """Calculate overall risk score and status"""
        risk = 0.0

        # Syntax invalid = 100% risk
        if not result.syntax_valid:
            return "invalid", 1.0

        # Disposable = 100% risk
        if result.is_disposable:
            return "invalid", 1.0

        # Domain issues = high risk
        if not result.domain_valid:
            risk += 0.4
        if not result.mx_valid:
            risk += 0.25

        # SMTP verification
        if not smtp_verified:
            risk += 0.35
            if smtp_error and "does not exist" in smtp_error:
                risk += 0.2  # Extra penalty for non-existent mailbox

        # Catch-all is risky for outreach
        if result.is_catch_all:
            risk += 0.15

        # Cap at 1.0
        risk = min(risk, 1.0)

        # Determine status
        if risk <= 0.2:
            status = "verified"
        elif risk <= 0.5:
            status = "risky"  # Might work, but uncertain
        elif result.is_catch_all:
            status = "catch_all"  # Accepts all, but unverifiable
        else:
            status = "invalid"

        return status, round(risk, 2)

    def verify_batch(self, emails: list) -> list:
        """Verify multiple emails"""
        results = []
        for email in emails:
            result = self.verify(email)
            results.append(result)
        return results


def random_string(length: int = 8) -> str:
    """Generate random string for catch-all testing"""
    import random
    import string
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


# Global verifier instance
verifier = EmailVerifier()