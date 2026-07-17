from app.services.whatsapp_verification import OTP_LENGTH, _generate_code


def test_generate_code_is_correct_length_and_numeric():
    code = _generate_code()
    assert len(code) == OTP_LENGTH
    assert code.isdigit()


def test_generate_code_is_zero_padded():
    # secrets.randbelow can return small numbers - confirm they're padded
    # rather than producing a short code (e.g. "42" instead of "000042").
    codes = [_generate_code() for _ in range(200)]
    assert all(len(c) == OTP_LENGTH for c in codes)
