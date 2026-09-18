from pathlib import Path

import joblib
from scipy.sparse import hstack


# =========================================================
# MODEL PATH
# =========================================================

BASE_DIR = Path(__file__).resolve().parents[3]

MODEL_PATH = (
    BASE_DIR
    / "ml"
    / "models"
    / "ai_finance_assistant_hybrid_model.joblib"
)


# =========================================================
# LOAD SAVED HYBRID MODEL
# =========================================================

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"ML model file not found: {MODEL_PATH}"
    )

MODEL_PACKAGE = joblib.load(MODEL_PATH) 

MODEL = MODEL_PACKAGE["model"]

WORD_VECTORIZER = (
    MODEL_PACKAGE["word_vectorizer"]
)

CHAR_VECTORIZER = (
    MODEL_PACKAGE["char_vectorizer"]
)

CATEGORY_RULES = (
    MODEL_PACKAGE["category_rules"]
)

CATEGORIES = (
    MODEL_PACKAGE["categories"]
)


# =========================================================
# RULE-BASED CATEGORY PREDICTION
# =========================================================

def _rule_based_category(text: str) -> str | None:
    """
    Check high-confidence category rules first.

    Returns:
        Category name if a rule matches.
        None if no rule matches.
    """

    text_lower = text.lower().strip()

    for category, keywords in CATEGORY_RULES.items():

        for keyword in keywords:

            if keyword in text_lower:
                return category

    return None


# =========================================================
# SVM CATEGORY PREDICTION
# =========================================================

def _svm_category(text: str) -> str:
    """
    Predict category using the saved:
        Word TF-IDF
        Character TF-IDF
        LinearSVC
    """

    word_features = WORD_VECTORIZER.transform(
        [text]
    )

    char_features = CHAR_VECTORIZER.transform(
        [text]
    )

    combined_features = hstack([
        word_features,
        char_features
    ])

    prediction = MODEL.predict(
        combined_features
    )[0]

    return prediction


# =========================================================
# PUBLIC PREDICTION FUNCTION
# =========================================================

def predict_category(text: str) -> dict:
    """
    Hybrid prediction system.

    1. Try a high-confidence rule.
    2. If no rule matches, use the SVM.
    """

    if not isinstance(text, str):
        raise ValueError(
            "Transaction text must be a string."
        )

    cleaned_text = text.strip()

    if not cleaned_text:
        raise ValueError(
            "Transaction text cannot be empty."
        )

    # -----------------------------------------------------
    # Rule-based prediction
    # -----------------------------------------------------

    rule_prediction = _rule_based_category(
        cleaned_text
    )

    if rule_prediction is not None:
        return {
            "category": rule_prediction,
            "method": "rule"
        }

    # -----------------------------------------------------
    # SVM fallback
    # -----------------------------------------------------

    svm_prediction = _svm_category(
        cleaned_text
    )

    return {
        "category": svm_prediction,
        "method": "svm"
    }


# =========================================================
# MODEL INFORMATION
# =========================================================

def get_model_info() -> dict:
    """
    Return information about the loaded model.
    """

    return {
        "model_type": MODEL_PACKAGE["model_type"],
        "feature_type": MODEL_PACKAGE["feature_type"],
        "categories": CATEGORIES,
        "final_holdout_metrics": MODEL_PACKAGE[
            "final_holdout_metrics"
        ]
    }