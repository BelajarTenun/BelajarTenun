"""F8: latih klasifikasi tahap ringan (MobileNetV3-Small, transfer learning) dari dataset hasil export_dataset.js.

    pip install -r scripts/train/requirements.txt
    python scripts/train/train.py --data dataset --out public/models/step-classifier

Keluaran:
  <out>/model.json + shard (TensorFlow.js, dimuat otomatis oleh public/js/local-model.js di HP)
  <out>/model.tflite         (untuk aplikasi Android / bridge Frame)
  <out>/labels.json          (urutan kelas "stepId__label")
  <out>/report.json          (akurasi validasi per kelas)

Pembagian latih/validasi per REKAMAN (bukan per frame) supaya frame dari video yang sama tidak bocor ke validasi.
"""
import argparse, json, os, random
from collections import defaultdict

import numpy as np
import tensorflow as tf

p = argparse.ArgumentParser()
p.add_argument("--data", default="dataset")
p.add_argument("--out", default="public/models/step-classifier")
p.add_argument("--epochs", type=int, default=15)
p.add_argument("--val", type=float, default=0.2)
p.add_argument("--seed", type=int, default=7)
a = p.parse_args()
random.seed(a.seed); tf.random.set_seed(a.seed)

manifest = json.load(open(os.path.join(a.data, "manifest.json")))
classes = sorted({i["class"] for i in manifest["items"]})
groups = sorted({i["group"] for i in manifest["items"]}); random.shuffle(groups)
val_groups = set(groups[: max(1, int(len(groups) * a.val))])
split = defaultdict(list)
for i in manifest["items"]:
    split["val" if i["group"] in val_groups else "train"].append((os.path.join(a.data, i["file"]), classes.index(i["class"])))
print({k: len(v) for k, v in split.items()}, "kelas:", len(classes))

def load(path, label, train):
    img = tf.image.resize(tf.io.decode_jpeg(tf.io.read_file(path), channels=3), (224, 224))
    if train:
        img = tf.image.random_brightness(img, 25)
        img = tf.image.random_contrast(img, 0.8, 1.2)
        img = tf.image.random_crop(tf.image.resize(img, (248, 248)), (224, 224, 3))
    return img / 127.5 - 1.0, label

def ds(items, train):
    paths, labels = zip(*items)
    d = tf.data.Dataset.from_tensor_slices((list(paths), list(labels)))
    if train: d = d.shuffle(len(items), seed=a.seed)
    return d.map(lambda x, y: load(x, y, train), num_parallel_calls=tf.data.AUTOTUNE).batch(32).prefetch(2)

base = tf.keras.applications.MobileNetV3Small(input_shape=(224, 224, 3), include_top=False, weights="imagenet", include_preprocessing=False)
base.trainable = False
model = tf.keras.Sequential([base, tf.keras.layers.GlobalAveragePooling2D(), tf.keras.layers.Dropout(0.3), tf.keras.layers.Dense(len(classes), activation="softmax")])
model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
train_ds, val_ds = ds(split["train"], True), ds(split["val"], False)
model.fit(train_ds, validation_data=val_ds, epochs=a.epochs)
base.trainable = True  # fine-tune ringan
model.compile(optimizer=tf.keras.optimizers.Adam(1e-5), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
model.fit(train_ds, validation_data=val_ds, epochs=max(3, a.epochs // 3))

os.makedirs(a.out, exist_ok=True)
y_true = np.array([l for _, l in split["val"]])
y_pred = model.predict(val_ds).argmax(1)
report = {c: {"n": int((y_true == i).sum()), "acc": float((y_pred[y_true == i] == i).mean()) if (y_true == i).any() else None} for i, c in enumerate(classes)}
report["_overall"] = float((y_pred == y_true).mean())
json.dump(classes, open(os.path.join(a.out, "labels.json"), "w"))
json.dump(report, open(os.path.join(a.out, "report.json"), "w"), indent=2)
open(os.path.join(a.out, "model.tflite"), "wb").write(tf.lite.TFLiteConverter.from_keras_model(model).convert())
try:
    import tensorflowjs as tfjs
    tfjs.converters.save_keras_model(model, a.out)
except ImportError:
    print("tensorflowjs belum terpasang: model TF.js tidak dibuat (pip install tensorflowjs)")
print("Akurasi validasi:", report["_overall"])
