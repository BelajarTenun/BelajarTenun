"""Pisahkan orang dari latar per frame (MODNet ONNX) dan buat dua video:
  <out>-grade.mp4  : footage dengan grade "kanan" (latar sedikit gelap + blur tipis, bawah & samping sedikit gelap)
  <out>-person.mov : hanya orangnya, latar transparan (ProRes 4444) — untuk teks di belakang orang
Pakai: python3 matte.py input.mov start dur out_prefix
"""
import sys, subprocess, numpy as np, cv2, onnxruntime as ort
from huggingface_hub import hf_hub_download

src, ss, dur, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
W, H, FPS = 1920, 1080, 30
sess = ort.InferenceSession(hf_hub_download('Xenova/modnet', 'onnx/model.onnx'), providers=['CPUExecutionProvider'])
iname = sess.get_inputs()[0].name

dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', ss, '-t', dur, '-i', src, '-vf', f'scale={W}:{H},fps={FPS}', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE)
enc_g = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '17', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'{out}-grade.mp4'], stdin=subprocess.PIPE)
enc_p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', f'{out}-person.mov'], stdin=subprocess.PIPE)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
sx = np.clip((np.abs(xx - W / 2) / (W / 2) - 0.45) / 0.55, 0, 1) ** 1.6
sy = np.clip((yy / H - 0.62) / 0.38, 0, 1) ** 1.5
dark = (1 - np.clip(0.40 * sx + 0.40 * sy, 0, 0.6))[..., None]
prev = None
n = 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3:
        break
    img = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    x = cv2.resize(cv2.cvtColor(img, cv2.COLOR_BGR2RGB), (672, 384)).astype(np.float32) / 127.5 - 1
    m = sess.run(None, {iname: x.transpose(2, 0, 1)[None]})[0][0, 0]
    m = cv2.resize(m, (W, H))
    m = m if prev is None else 0.6 * m + 0.4 * prev   # redam kedip antar-frame
    prev = m
    ms = cv2.GaussianBlur(m, (0, 0), 3)[..., None]
    f = img.astype(np.float32)
    bg = cv2.GaussianBlur(f, (0, 0), 2) * 0.85
    g = np.clip((f * ms + bg * (1 - ms)) * dark, 0, 255).astype(np.uint8)
    enc_g.stdin.write(g.tobytes())
    pa = np.dstack([np.clip(f * dark, 0, 255).astype(np.uint8), (np.clip((m - 0.15) / 0.7, 0, 1) * 255).astype(np.uint8)])
    enc_p.stdin.write(pa.tobytes())
    n += 1
for e in (enc_g, enc_p):
    e.stdin.close(); e.wait()
print(out, n, 'frame')
