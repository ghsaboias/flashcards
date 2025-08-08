import re


def validate_answer(user_answer: str, correct_answer: str) -> bool:
    """Validate a user answer against the correct answer(s).

    Supports multiple correct answers separated by ';' or ' or '.
    Comparison is case-insensitive and trims whitespace.
    """
    if correct_answer is None:
        return False

    ua = (user_answer or "").strip().lower()
    ans = (correct_answer or "").strip().lower()

    if ";" in ans or " or " in ans:
        correct_parts = [part.strip().lower() for part in re.split(r"[;]| or ", ans)]
        correct_parts = [p for p in correct_parts if p]
        user_parts = [part.strip().lower() for part in ua.split(" or ")]
        user_parts = [p for p in user_parts if p]
        return any(part in correct_parts for part in user_parts)

    return ua == ans


