# XSS and SQL Injection Test Payloads

## Test Plan for Input Validation

### Test Scenarios

#### 1. XSS Prevention Tests

**Basic Script Injection**
```
Input: <script>alert('XSS')</script>
Expected: Sanitized to empty string or text content
Actual: [To be tested]
```

**Event Handler Injection**
```
Input: <img src=x onerror=alert('XSS')>
Expected: Removed or sanitized
Actual: [To be tested]
```

**SVG-based XSS**
```
Input: <svg onload=alert('XSS')>
Expected: SVG tag removed
Actual: [To be tested]
```

**JavaScript Protocol**
```
Input: <a href="javascript:alert('XSS')">Click</a>
Expected: href attribute removed or javascript: stripped
Actual: [To be tested]
```

**HTML Entity Encoded**
```
Input: &lt;script&gt;alert('XSS')&lt;/script&gt;
Expected: Displayed as text, not executed
Actual: [To be tested]
```

#### 2. SQL Injection Prevention Tests

**Classic SQL Injection**
```
Input: ' OR '1'='1
Expected: Rejected by preventSQLInjection
Actual: [To be tested]
```

**Union-based Injection**
```
Input: ' UNION SELECT * FROM users--
Expected: Rejected (UNION keyword detected)
Actual: [To be tested]
```

**Comment-based Bypass**
```
Input: admin'--
Expected: Rejected (-- comment detected)
Actual: [To be tested]
```

**Multi-statement Injection**
```
Input: '; DROP TABLE users; --
Expected: Rejected (semicolon + DROP detected)
Actual: [To be tested]
```

**Boolean-based Blind SQLi**
```
Input: ' AND 1=1--
Expected: Rejected (AND + 1=1 pattern)
Actual: [To be tested]
```

#### 3. Turkish Validation Tests

**TC Kimlik Numarası**
```
Valid:   12345678901 (if checksum valid)
Invalid: 00000000000 (starts with 0)
Invalid: 123456789 (too short)
Invalid: 12345678900 (invalid checksum)
```

**Vergi Kimlik Numarası**
```
Valid:   1234567890 (10 digits)
Invalid: 123456789 (9 digits)
Invalid: 12345678901 (11 digits)
```

**IBAN (Turkish)**
```
Valid:   TR330006100519786457841326
Invalid: US12345678901234567890 (wrong country)
Invalid: TR12 (too short)
```

#### 4. Real-time Validation UX Tests

**"Reward Early, Punish Late" Pattern**
- Input field should NOT show error while typing
- Error should appear only after blur (user leaves field)
- Valid input should show success immediately on blur

**Debouncing Test**
- Rapid typing should NOT trigger validation on every keystroke
- Validation should trigger after 300ms of inactivity (after blur)

**Accessibility Test**
- Error messages should have role="alert"
- Input should have aria-invalid="true" when invalid
- Error container should have unique ID linked via aria-describedby

#### 5. Form Integration Tests

**Personnel Form**
- Full name: Should accept Turkish characters (ğ, ü, ş, etc.)
- Department: Should limit to 100 chars
- Monthly salary: Should accept positive numbers only
- Start date: Should validate date format

**Stock Form**
- Product name: Should prevent XSS
- Product code: Should uppercase and limit 3-20 chars
- Unit weight: Should accept decimals with 3 precision
- Subcategory: Should sanitize input

**Transaction Form**
- Amount: Should be positive currency
- Date: Should validate ISO format
- Description: Should limit 500 chars, prevent XSS/SQLi

## Test Execution

### Manual Testing Steps

1. **Open Browser DevTools**
   - Go to Console tab to see validation logs

2. **Test XSS Payloads**
   - For each payload above:
     - Enter into any text input (personnel name, product name, etc.)
     - Blur the field
     - Check if error appears
     - Check console for "Güvenlik nedeniyle HTML/Script kodları kullanılamaz"
     - Verify sanitized value doesn't contain script tags

3. **Test SQL Injection Payloads**
   - For each payload:
     - Enter into text inputs
     - Check for "Güvenlik nedeniyle bu karakterler kullanılamaz" error
     - Verify pattern detection works (OR, UNION, --, ;, etc.)

4. **Test Turkish Validators**
   - Enter TC Kimlik numbers with valid/invalid checksums
   - Verify algorithm validation works
   - Test Vergi No length validation
   - Test IBAN format and country code

5. **Test Real-time UX**
   - Type rapidly without leaving field → No error should appear
   - Leave field (blur) → Validation triggers
   - Correct error and blur again → Success icon appears
   - Type in valid field → No error during typing

6. **Test Form Submission**
   - Fill form with invalid data
   - Click submit
   - Verify ALL errors appear at once
   - Verify first error field gets focus
   - Verify form doesn't submit
   - Correct all errors
   - Submit → Should succeed with sanitized data

## Security Logging Verification

After testing, check security events:

```sql
-- Check for logged XSS attempts (if validation rejection logging is implemented)
SELECT * FROM security_events
WHERE event_type = 'VALIDATION_FAILED'
AND metadata->>'attempted_value' LIKE '%<script%'
ORDER BY timestamp DESC
LIMIT 10;
```

## Success Criteria

✅ All XSS payloads are sanitized or rejected
✅ All SQL injection patterns are detected and rejected
✅ Turkish validators correctly validate TC Kimlik, Vergi No, IBAN
✅ Real-time validation follows "reward early, punish late" pattern
✅ Validation errors have proper accessibility attributes
✅ Forms prevent submission with invalid data
✅ Sanitized data is used in database operations

## Known Limitations

⚠️ DOMPurify is custom implementation (lightweight)
   - For production, consider using actual DOMPurify library from CDN
   - Current implementation covers common XSS vectors but may miss edge cases

⚠️ SQL Injection prevention is defense-in-depth
   - Primary protection is parameterized queries in Supabase
   - Pattern detection is additional layer for user feedback
   - Database RLS policies provide final security layer

## Next Steps After Testing

1. Document any failed tests
2. Fix validation gaps discovered
3. Add automated tests (if needed)
4. Update security audit score based on validation coverage
5. Create Sprint 2.1 implementation summary