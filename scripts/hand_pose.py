"""Ekstrak landmark tangan (MediaPipe Hand Landmarker, 21 titik per tangan) dari video → JSON untuk lib/kinematics.js.

    pip install mediapipe opencv-python-headless
    curl -L -o hand_landmarker.task \
      https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
    python scripts/hand_pose.py <video.mp4> <keluaran.json> [--model hand_landmarker.task] [--fps 15]

Memakai MediaPipe Tasks API (RunningMode.VIDEO). API lama mp.solutions sudah tidak ada di mediapipe ≥ 0.10.2x.
Keluaran: {"video", "fps", "model", "frames": [{"t": detik, "hands": [{"handedness": "Left"|"Right", "score",
           "landmarks": [{"x","y","z"} × 21]}]}]}  — koordinat dinormalkan 0–1 terhadap ukuran gambar.
Hanya koordinat yang disimpan (tanpa gambar wajah/tubuh).
"""
import argparse
import json

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--model", default="hand_landmarker.task")
    ap.add_argument("--fps", type=float, default=15.0)
    ap.add_argument("--min-score", type=float, default=0.5)
    a = ap.parse_args()

    opts = vision.HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=a.model), running_mode=vision.RunningMode.VIDEO, num_hands=2,
        min_hand_detection_confidence=a.min_score, min_hand_presence_confidence=a.min_score, min_tracking_confidence=a.min_score)
    cap = cv2.VideoCapture(a.video)
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    step = max(1, round(src_fps / a.fps))
    frames, i = [], 0
    with vision.HandLandmarker.create_from_options(opts) as lm:
        while True:
            ok, img = cap.read()
            if not ok:
                break
            if i % step == 0:
                t_ms = int(i * 1000 / src_fps)
                res = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)), t_ms)
                hands = [{"handedness": h[0].category_name, "score": round(h[0].score, 3),
                          "landmarks": [{"x": round(p.x, 4), "y": round(p.y, 4), "z": round(p.z, 4)} for p in pts]}
                         for pts, h in zip(res.hand_landmarks, res.handedness)]
                frames.append({"t": round(t_ms / 1000, 3), "hands": hands})
            i += 1
    cap.release()
    with open(a.out, "w") as f:
        json.dump({"video": a.video, "fps": a.fps, "model": "mediapipe hand_landmarker", "frames": frames}, f)
    found = sum(1 for f in frames if f["hands"])
    print(f"{len(frames)} frame, {found} dengan tangan terdeteksi ({found / max(1, len(frames)):.0%}) -> {a.out}")


if __name__ == "__main__":
    main()
