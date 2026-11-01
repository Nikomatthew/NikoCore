import asyncio
import io
import os
import threading
import time
from pathlib import Path

import numpy as np
import sherpa_onnx
import soundfile as sf
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile

ROOT = Path(__file__).resolve().parent
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
lock = threading.Lock()
recognizer = None
server = None
last_used = time.monotonic()
active = 0


def transcribe(data):
    global recognizer
    samples, rate = sf.read(io.BytesIO(data), dtype="float32")
    if rate != 16000 or samples.ndim != 1:
        raise ValueError("需要 16kHz 单声道 WAV")
    if recognizer is None:
        recognizer = sherpa_onnx.OfflineRecognizer.from_paraformer(
            paraformer=str(ROOT / "models/model.int8.onnx"),
            tokens=str(ROOT / "models/tokens.txt"),
            num_threads=2,
        )
    config = sherpa_onnx.VadModelConfig(
        silero_vad=sherpa_onnx.SileroVadModelConfig(
            model=str(ROOT / "models/silero_vad.onnx"),
            max_speech_duration=25,
        ),
        sample_rate=16000,
        num_threads=1,
    )
    vad = sherpa_onnx.VoiceActivityDetector(config, buffer_size_in_seconds=60)
    segments = []

    def drain():
        while not vad.empty():
            speech = vad.front
            stream = recognizer.create_stream()
            stream.accept_waveform(16000, speech.samples)
            recognizer.decode_stream(stream)
            text = stream.result.text.strip()
            if text:
                segments.append({"start": speech.start / rate, "end": (speech.start + len(speech.samples)) / rate, "text": text})
            vad.pop()

    for offset in range(0, len(samples), 512):
        window = samples[offset:offset + 512]
        if len(window) < 512:
            window = np.pad(window, (0, 512 - len(window)))
        vad.accept_waveform(window)
        drain()
    vad.flush()
    drain()
    return {"text": "，".join(s["text"] for s in segments), "segments": segments, "language": "zh", "model": "paraformer-zh-2024-03-09"}


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/v1/audio/transcriptions")
async def transcription(file: UploadFile = File(...)):
    global last_used, active
    active += 1
    try:
        data = await file.read(64 * 1024 * 1024 + 1)
        if len(data) > 64 * 1024 * 1024:
            raise HTTPException(413, "请分段上传音频")
        def run():
            with lock:
                return transcribe(data)
        return await asyncio.to_thread(run)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "音频识别失败，请检查文件格式和模型")
    finally:
        active -= 1
        last_used = time.monotonic()
        await file.close()


@app.post("/shutdown")
async def shutdown():
    if active:
        raise HTTPException(409, "还有音频正在识别")
    server.should_exit = True
    return {"ok": True}


def idle_watch():
    while not server.should_exit:
        time.sleep(2)
        if not active and time.monotonic() - last_used > 60:
            server.should_exit = True


if __name__ == "__main__":
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=int(os.environ.get("NIKOLINK_ASR_PORT", "18764")), log_level="warning"))
    threading.Thread(target=idle_watch, daemon=True).start()
    server.run()
