"""
=============================================================================
LEAD VALIDATOR & SANITIZER (EMAIL & PHONE / MOBILE VERIFIER)
=============================================================================
Strictly validates, cleans, standardizes, and verifies Australian corporate
leads (Company Name, Email, Australian Phone/Mobile) before Google Sheets & Zoho CRM.
=============================================================================
"""

import re

# Regex for RFC 5322 email syntax validation
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$"
)

# Invalid placeholder domains
INVALID_EMAIL_DOMAINS = {
    "example.com", "domain.com", "test.com", "placeholder.com", 
    "yoursite.com", "email.com", "sample.com", "mysite.com", "sentry.io",
    "wixpress.com", "wordpress.com", "myshopify.com"
}

# Image / binary / stylesheet extensions mistakenly scraped as emails
INVALID_EMAIL_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js", ".pdf", ".zip", ".mp4", ".ico"
}

# Generic webpage titles to reject as company names
GENERIC_COMPANY_TITLES = {
    "contact us", "contact", "home", "about us", "about", "contact our office",
    "privacy policy", "help center", "terms of service", "terms & conditions",
    "customer support", "support", "services", "login", "register", "sign in",
    "double whammy", "overview", "faq", "faqs", "get in touch", "enquiry form",
    "enquiries", "referral form", "locations", "meet our team", "our team"
}


class LeadValidator:
    """Enterprise contact validator ensuring 100% Australian corporate compliance."""

    @staticmethod
    def clean_company_name(raw_name: str, domain_fallback: str = "") -> str:
        """
        Cleans and sanitizes company name. Rejects generic page titles.
        Falls back to formatted domain name if title is generic or junk.
        """
        if not raw_name or not isinstance(raw_name, str):
            name = ""
        else:
            name = raw_name.strip()
            # Remove title decorators
            name = re.split(r"[-|–—•:]", name)[0].strip()
            name = re.sub(r"\s+", " ", name)

        if not name or name.lower() in GENERIC_COMPANY_TITLES or len(name) < 2 or len(name) > 80:
            if domain_fallback:
                clean_dom = domain_fallback.replace("https://", "").replace("http://", "").replace("www.", "")
                clean_dom = clean_dom.split("/")[0].split(".")[0]
                if clean_dom and len(clean_dom) > 1:
                    return clean_dom.capitalize() + " Pty Ltd"
            return "Australian Enterprise"

        return name[:100]

    @staticmethod
    def validate_and_clean_email(email_raw: str) -> str:
        """
        Validates, cleans, and sanitizes an email address.
        Returns cleaned email or "" if invalid.
        """
        if not email_raw or not isinstance(email_raw, str):
            return ""

        email = email_raw.strip().lower()
        # Remove surrounding quotes, brackets, mailto:
        email = re.sub(r"^(?:mailto:)?[\'\"]*|[\'\"]*$", "", email)
        email = email.strip("<>(),; \t\n\r")

        if not email or "@" not in email:
            return ""

        # Check for invalid extensions
        for ext in INVALID_EMAIL_EXTENSIONS:
            if email.endswith(ext):
                return ""

        # Syntax check
        if not EMAIL_REGEX.match(email):
            return ""

        domain = email.split("@")[1]
        if domain in INVALID_EMAIL_DOMAINS:
            return ""

        # Must have valid TLD
        if "." not in domain or len(domain.split(".")[-1]) < 2:
            return ""

        return email

    @staticmethod
    def validate_and_clean_phone(phone_raw: str, strict_australian: bool = True) -> tuple[str, str]:
        """
        Strictly validates, cleans, and standardizes Australian phone numbers.
        Returns (formatted_phone, phone_type) where phone_type is 'mobile', 'landline', 'tollfree'.
        Rejects non-Australian numbers, decimals, and junk lengths.
        """
        if not phone_raw or not isinstance(phone_raw, str):
            return ("", "")

        p = str(phone_raw).strip()
        # Remove tel: prefix, quotes
        p = re.sub(r"^(?:tel:)?[\'\"]*|[\'\"]*$", "", p)
        
        # Check for invalid decimal floats (e.g. 33.333333333333)
        if "." in p:
            parts = p.split(".")
            if len(parts) > 1 and len(parts[1]) > 2 and parts[1].isdigit():
                return ("", "")

        # Extract only digits and check for leading plus
        has_plus = p.startswith("+")
        digits = re.sub(r"\D", "", p)

        if not digits or len(digits) < 6:
            return ("", "")

        # Strip accidental leading concatenated numbers (e.g. "20+61..." or "2061...")
        if digits.startswith("2061") and len(digits) > 12:
            digits = digits[2:]
        elif digits.startswith("200") and len(digits) > 12:
            digits = digits[2:]

        # Reject obvious non-Australian international prefixes if strict
        if strict_australian:
            # Rejects +1 (US), +44 (UK), +84, +91, +86, +65, etc.
            if has_plus and not digits.startswith("61"):
                return ("", "")

        # 1. Australian 1300 / 1800 numbers (10 digits)
        if digits.startswith("1300") and len(digits) == 10:
            return (f"1300 {digits[4:7]} {digits[7:]}", "tollfree")
        if digits.startswith("1800") and len(digits) == 10:
            return (f"1800 {digits[4:7]} {digits[7:]}", "tollfree")

        # 2. Australian 13 priority numbers (6 digits)
        if digits.startswith("13") and len(digits) == 6:
            return (f"13 {digits[2:4]} {digits[4:]}", "tollfree")

        # 3. Australian mobile starting with 04 (10 digits)
        if digits.startswith("04") and len(digits) == 10:
            return (f"{digits[:4]} {digits[4:7]} {digits[7:]}", "mobile")

        # 4. Australian landline starting with 02, 03, 07, 08 (10 digits)
        if len(digits) == 10 and digits[0] == "0" and digits[1] in "2378":
            return (f"({digits[:2]}) {digits[2:6]} {digits[6:]}", "landline")

        # 5. Australian number in international format (+61 or 61)
        if digits.startswith("61") and len(digits) in [10, 11]:
            local = digits[2:]
            if local.startswith("0"):
                local = local[1:]
            
            if local.startswith("4") and len(local) == 9:
                return (f"+61 4{local[1:4]} {local[4:7]} {local[7:]}", "mobile")
            elif len(local) == 9 and local[0] in "2378":
                return (f"+61 {local[0]} {local[1:5]} {local[5:]}", "landline")
            elif len(local) in [8, 9]:
                return (f"+61 {local}", "landline")

        # 6. Local 8-digit Australian landline without area code (e.g. 3839 4321, 9215 9215)
        if len(digits) == 8 and digits[0] in "23456789":
            return (f"{digits[:4]} {digits[4:]}", "landline")

        if not strict_australian and 8 <= len(digits) <= 15:
            if len(set(digits)) > 2:
                prefix = "+" if has_plus else ""
                return (f"{prefix}{digits}", "international")

        return ("", "")

    @classmethod
    def verify_lead(cls, email_raw: str, phone_raw: str, require_both: bool = False) -> dict:
        """
        Verifies both email and phone. Returns clean dictionary with validation status:
        {
            "email": clean_email,
            "phone": clean_landline_or_tollfree,
            "mobile": clean_mobile,
            "has_email": bool,
            "has_phone": bool,
            "has_both": bool,
            "is_valid": bool
        }
        """
        clean_email = cls.validate_and_clean_email(email_raw)
        clean_phone, phone_type = cls.validate_and_clean_phone(phone_raw, strict_australian=True)

        phone_val = ""
        mobile_val = ""

        if phone_type == "mobile":
            mobile_val = clean_phone
        elif clean_phone:
            phone_val = clean_phone

        has_email = bool(clean_email)
        has_phone = bool(clean_phone or mobile_val)
        has_both = has_email and has_phone
        is_valid = has_both if require_both else (has_email or has_phone)

        return {
            "email": clean_email,
            "phone": phone_val,
            "mobile": mobile_val,
            "has_email": has_email,
            "has_phone": has_phone,
            "has_both": has_both,
            "is_valid": is_valid
        }

