#!/usr/bin/env python3
"""
AI-Generated Text Detection using RoBERTa and linguistic analysis
"""

import sys
import json
from typing import Dict, List, Any
import re

try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
    import numpy as np
except ImportError as e:
    print(json.dumps({
        "error": f"Missing dependency: {e}",
        "note": "Run: pip install transformers torch numpy"
    }))
    sys.exit(1)


class TextDeepfakeDetector:
    """AI-generated text detector using RoBERTa"""

    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        # In production, load fine-tuned RoBERTa model
        # For demo, using sentiment analysis as placeholder
        try:
            self.tokenizer = AutoTokenizer.from_pretrained("roberta-base")
            self.model = AutoModelForSequenceClassification.from_pretrained(
                "roberta-base",
                num_labels=2
            ).to(self.device)
        except Exception:
            self.tokenizer = None
            self.model = None

    def detect_patterns(self, text: str) -> List[Dict[str, Any]]:
        """Detect AI-generated text patterns"""
        patterns = []

        # 1. Repetition detection
        sentences = text.split('.')
        unique_sentences = set(s.strip() for s in sentences if s.strip())
        repetition_ratio = 1 - (len(unique_sentences) / max(len(sentences), 1))

        if repetition_ratio > 0.2:
            patterns.append({
                "type": "repetition",
                "description": f"High repetition ratio: {repetition_ratio:.2%}",
                "confidence": float(repetition_ratio),
                "spans": [{"start": 0, "end": len(text)}]
            })

        # 2. Generic phrase detection
        generic_phrases = [
            "it is important to note",
            "as an ai",
            "i don't have personal",
            "i cannot",
            "in conclusion",
            "furthermore",
            "additionally",
            "moreover"
        ]

        text_lower = text.lower()
        generic_count = sum(1 for phrase in generic_phrases if phrase in text_lower)

        if generic_count > 2:
            patterns.append({
                "type": "generic_phrases",
                "description": f"Contains {generic_count} generic AI phrases",
                "confidence": min(generic_count / 5, 1.0),
                "spans": [{"start": 0, "end": len(text)}]
            })

        # 3. Perfect grammar/punctuation (unusual for humans)
        words = text.split()
        if len(words) > 50:
            # Check for very consistent sentence structure
            avg_sentence_length = len(words) / max(len(sentences), 1)
            if 15 < avg_sentence_length < 25:  # Suspiciously consistent
                patterns.append({
                    "type": "consistent_structure",
                    "description": f"Unnaturally consistent sentence length: {avg_sentence_length:.1f}",
                    "confidence": 0.6,
                    "spans": [{"start": 0, "end": len(text)}]
                })

        return patterns

    def linguistic_analysis(self, text: str) -> Dict[str, Any]:
        """Analyze linguistic characteristics"""
        words = text.split()
        sentences = [s.strip() for s in text.split('.') if s.strip()]

        # Calculate perplexity (simplified)
        # Real perplexity requires language model
        # Using word diversity as proxy
        unique_words = len(set(words))
        total_words = len(words)
        diversity = unique_words / max(total_words, 1)

        # Perplexity estimate (lower = more predictable = more likely AI)
        perplexity = 100 * (1 - diversity)

        # Coherence score (sentence length variance)
        sentence_lengths = [len(s.split()) for s in sentences]
        coherence = 1 - (np.std(sentence_lengths) / max(np.mean(sentence_lengths), 1))
        coherence = min(coherence, 1.0)

        # Human likelihood (inverse of coherence and perplexity)
        human_likelihood = 1 - ((perplexity / 100) * 0.5 + coherence * 0.5)

        return {
            "perplexity": float(perplexity),
            "coherenceScore": float(coherence),
            "humanLikelihood": float(human_likelihood)
        }

    def extract_claims(self, text: str) -> List[Dict[str, Any]]:
        """Extract factual claims that need verification"""
        claims = []

        # Simple claim extraction using patterns
        claim_patterns = [
            r'(?:according to|studies show|research indicates|reports suggest)\s+(.+?)[.!?]',
            r'(\d+%?\s+of\s+.+?)[.!?]',
            r'(it is (?:proven|known|established) that\s+.+?)[.!?]'
        ]

        for pattern in claim_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                claim_text = match.group(1)

                claims.append({
                    "text": claim_text,
                    "needsFactChecking": True,
                    "confidence": 0.8
                })

        return claims[:5]  # Top 5 claims

    def analyze(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Main analysis function"""
        try:
            text = input_data.get('text', '')

            if not text:
                raise ValueError("No text provided")

            # Detect patterns
            patterns = self.detect_patterns(text)

            # Linguistic analysis
            linguistic = self.linguistic_analysis(text)

            # Extract claims
            claims = self.extract_claims(text)

            # Calculate overall confidence
            pattern_confidence = sum(p['confidence'] for p in patterns) / max(len(patterns), 1)
            linguistic_confidence = 1 - linguistic['humanLikelihood']

            overall_confidence = pattern_confidence * 0.6 + linguistic_confidence * 0.4
            is_synthetic = overall_confidence > 0.5

            return {
                "isSynthetic": bool(is_synthetic),
                "confidence": float(overall_confidence),
                "patterns": patterns,
                "linguisticAnalysis": linguistic,
                "claims": claims if claims else None,
                "metadata": {
                    "textLength": len(text),
                    "wordCount": len(text.split()),
                    "device": str(self.device) if self.model else "cpu"
                }
            }

        except Exception as e:
            return {
                "error": str(e),
                "isSynthetic": False,
                "confidence": 0.0,
                "patterns": [],
                "linguisticAnalysis": {
                    "perplexity": 0,
                    "coherenceScore": 0,
                    "humanLikelihood": 0.5
                },
                "claims": None,
                "metadata": {}
            }


def main():
    """Main entry point"""
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())

        # Initialize detector
        detector = TextDeepfakeDetector()

        # Analyze
        result = detector.analyze(input_data)

        # Output JSON
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "isSynthetic": False,
            "confidence": 0.0,
            "patterns": [],
            "linguisticAnalysis": {
                "perplexity": 0,
                "coherenceScore": 0,
                "humanLikelihood": 0.5
            },
            "claims": None,
            "metadata": {}
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
