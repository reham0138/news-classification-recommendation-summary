"""Text helpers shared by training and serving, so both always clean text identically."""
import re

# Notebook section 6: raw dataset labels -> the 14 classes the classifier predicts.
CATEGORY_MAP = {
    "crime, law and justice": "crime",
    "arts, culture, entertainment and media": "arts_entertainment",
    "entertainment": "arts_entertainment",
    "economy, business and finance": "business",
    "business": "business",
    "disaster, accident and emergency incident": "disaster",
    "conflict, war and peace": "politics",
    "environment": "environment",
    "education": "education",
    "health": "health",
    "human interest": "lifestyle",
    "lifestyle and leisure": "lifestyle",
    "politics": "politics",
    "labour": "business",
    "religion and belief": "religion",
    "science and technology": "science",
    "technology": "technology",
    "society": "lifestyle",
    "sport": "sports",
    "sports": "sports",
    "weather": "weather",
}


def clean_text(text: str) -> str:
    """Notebook section 3: strip HTML tags, collapse whitespace."""
    text = re.sub(r"<.*?>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def word_count(text: str) -> int:
    return len(text.split())
