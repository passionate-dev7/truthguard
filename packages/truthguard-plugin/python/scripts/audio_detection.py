#!/usr/bin/env python3
"""
Audio Deepfake Detection using spectral analysis and voice biometrics
"""

import sys
import json
import base64
from io import BytesIO
from typing import Dict, List, Any
import numpy as np

try:
    import librosa
    import soundfile as sf
except ImportError as e:
    print(json.dumps({
        "error": f"Missing dependency: {e}",
        "note": "Run: pip install librosa soundfile"
    }))
    sys.exit(1)


class AudioDeepfakeDetector:
    """Audio deepfake and voice cloning detector"""

    def __init__(self):
        self.sample_rate = 16000

    def load_audio(self, input_data: Dict[str, Any]) -> np.ndarray:
        """Load audio from various input sources"""
        if 'audioBase64' in input_data and input_data['audioBase64']:
            audio_data = base64.b64decode(input_data['audioBase64'])
            audio, _ = librosa.load(BytesIO(audio_data), sr=self.sample_rate)
            return audio

        elif 'audioPath' in input_data and input_data['audioPath']:
            audio, _ = librosa.load(input_data['audioPath'], sr=self.sample_rate)
            return audio

        elif 'audioUrl' in input_data and input_data['audioUrl']:
            raise ValueError("URL loading not implemented in this demo")

        else:
            raise ValueError("No valid audio input provided")

    def detect_anomalies(self, audio: np.ndarray) -> List[Dict[str, Any]]:
        """Detect temporal anomalies in audio"""
        anomalies = []

        # Frame-level energy analysis
        frame_length = int(0.025 * self.sample_rate)  # 25ms frames
        hop_length = int(0.010 * self.sample_rate)    # 10ms hop

        # Calculate frame energy
        frames = librosa.util.frame(audio, frame_length=frame_length, hop_length=hop_length)
        energy = np.sum(frames ** 2, axis=0)

        # Detect sudden energy changes (potential splicing)
        energy_diff = np.abs(np.diff(energy))
        threshold = np.mean(energy_diff) + 2 * np.std(energy_diff)

        anomaly_indices = np.where(energy_diff > threshold)[0]

        for idx in anomaly_indices[:10]:  # Top 10 anomalies
            timestamp = idx * hop_length / self.sample_rate
            duration = frame_length / self.sample_rate
            confidence = min(energy_diff[idx] / threshold, 1.0)

            anomalies.append({
                "type": "energy_spike",
                "timestamp": float(timestamp),
                "duration": float(duration),
                "confidence": float(confidence * 0.7)
            })

        return anomalies

    def spectral_analysis(self, audio: np.ndarray) -> Dict[str, Any]:
        """Analyze spectral characteristics for artificial patterns"""
        # Compute spectrogram
        D = librosa.stft(audio)
        mag_db = librosa.amplitude_to_db(np.abs(D), ref=np.max)

        # Detect artificial patterns
        # 1. Check for periodic artifacts in high frequencies
        high_freq_energy = np.mean(mag_db[int(mag_db.shape[0] * 0.8):, :])

        # 2. Detect unnatural frequency gaps
        freq_variance = np.var(mag_db, axis=1)
        unusual_gaps = np.where(freq_variance < 5)[0]

        has_artificial_patterns = len(unusual_gaps) > 10 or high_freq_energy > -30

        return {
            "hasArtificialPatterns": bool(has_artificial_patterns),
            "frequencyAnomalies": unusual_gaps.tolist()[:20]  # Top 20
        }

    def voice_analysis(self, audio: np.ndarray) -> Dict[str, Any]:
        """Analyze voice characteristics for synthesis detection"""
        # Extract pitch
        pitches, magnitudes = librosa.piptrack(y=audio, sr=self.sample_rate)

        # Get pitch values
        pitch_values = []
        for t in range(pitches.shape[1]):
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            if pitch > 0:
                pitch_values.append(pitch)

        if len(pitch_values) == 0:
            return {
                "isSyntheticVoice": False,
                "confidence": 0.0,
                "prosodyScore": 0.5
            }

        # Calculate pitch statistics
        pitch_mean = np.mean(pitch_values)
        pitch_std = np.std(pitch_values)

        # Prosody analysis (naturalness score)
        # Natural speech has more pitch variation
        prosody_score = min(pitch_std / (pitch_mean + 1e-6), 1.0)

        # Synthetic voice detection heuristic
        is_synthetic = prosody_score < 0.05 or pitch_std > 100
        confidence = abs(prosody_score - 0.5) * 2

        return {
            "isSyntheticVoice": bool(is_synthetic),
            "confidence": float(confidence),
            "prosodyScore": float(prosody_score)
        }

    def analyze(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Main analysis function"""
        try:
            # Load audio
            audio = self.load_audio(input_data)

            # Detect anomalies
            anomalies = self.detect_anomalies(audio)

            # Spectral analysis
            spectral = self.spectral_analysis(audio)

            # Voice analysis
            voice = self.voice_analysis(audio)

            # Calculate overall confidence
            anomaly_confidence = sum(a['confidence'] for a in anomalies) / max(len(anomalies), 1)
            spectral_confidence = 0.7 if spectral['hasArtificialPatterns'] else 0.3
            voice_confidence = voice['confidence']

            overall_confidence = (
                anomaly_confidence * 0.3 +
                spectral_confidence * 0.3 +
                voice_confidence * 0.4
            )

            is_synthetic = overall_confidence > 0.5

            return {
                "isSynthetic": bool(is_synthetic),
                "confidence": float(overall_confidence),
                "anomalies": anomalies,
                "spectralAnalysis": spectral,
                "voiceAnalysis": voice,
                "metadata": {
                    "duration": float(len(audio) / self.sample_rate),
                    "sampleRate": self.sample_rate
                }
            }

        except Exception as e:
            return {
                "error": str(e),
                "isSynthetic": False,
                "confidence": 0.0,
                "anomalies": [],
                "spectralAnalysis": {"hasArtificialPatterns": False, "frequencyAnomalies": []},
                "voiceAnalysis": None,
                "metadata": {}
            }


def main():
    """Main entry point"""
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())

        # Initialize detector
        detector = AudioDeepfakeDetector()

        # Analyze
        result = detector.analyze(input_data)

        # Output JSON
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "isSynthetic": False,
            "confidence": 0.0,
            "anomalies": [],
            "spectralAnalysis": {"hasArtificialPatterns": False, "frequencyAnomalies": []},
            "voiceAnalysis": None,
            "metadata": {}
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
